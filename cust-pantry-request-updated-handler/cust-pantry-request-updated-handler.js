/* eslint-disable prefer-destructuring */
/* eslint-disable no-unused-vars */
/* eslint-disable func-names */

const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });
const apiService = require('./service/api');
const API_CONSTANTS = require('./constants/api-requests');

const makeResponse = (statusCode, message) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message }),
  }
}
const getTransformPayload = (metadataDenormalized, notes, requesterEmail) => {
  let transformPayload;
  let requestContext = metadataDenormalized.request_context && JSON.parse(metadataDenormalized.request_context, null, 2);
  let approvedAssets = JSON.parse(metadataDenormalized.approved_assets);
  if (requestContext) {
    requestContext.assets = requestContext.assets.filter(asset => approvedAssets.includes(asset.objectId));
    if (requestContext.assets.length) {
      transformPayload = {
        transformations: requestContext.assets.map((asset) => {
          return {
            objectId: asset.objectId,
            includeOriginal: asset.includeOriginal,
            transformations: asset.transformations
          }
        }),
        //recipients: requestContext.recipients ? requestContext.recipients.filter(Boolean) : [requesterEmail],
        fileName: requestContext.fileName,
        location: requestContext.location
      }
    }
    if (requestContext.shareMessage) {
      transformPayload['shareMessage'] = requestContext.shareMessage;
    }
  } else {
    transformPayload = {
      transformations: approvedAssets.map((objectId) => {
        return {
          objectId,
          includeOriginal: true,
          transformations: []
        }
      }),
      //recipients: [requesterEmail]
    }
  }
  return transformPayload;
}

const lambdaHandler = async (event, context) => {
  console.info(`API EVENT: \n${JSON.stringify(event, null, 2)}`)
  if (!event || !event.Records || !event.Records[0] || !event.Records[0].body) throw new Error('INVALID EVENT PROVIDED')
  const payload = JSON.parse(JSON.parse(JSON.stringify(event.Records[0].body, null, 2)))
  const { objectId, customerId, metadataDocument } = payload

  if (!customerId) throw new Error('CustomerId missing');
  console.log(`Payload:  ${objectId} : ${customerId} - Metadata Length : ${metadataDocument.length}`)
  try {
    const apiTokenManagerPayload = {
      body: JSON.stringify({
        customerId
      })
    };
    const apiTokenManagerResponse = await lambda.invoke({
      FunctionName: 'tenovos-api-token-manager',
      Payload: JSON.stringify(apiTokenManagerPayload)
    }).promise();
    const userSession = JSON.parse(JSON.parse(apiTokenManagerResponse.Payload).body).session;
    const actionAsset = JSON.parse(await apiService.getAsset({ ...userSession, payload: { objectId } }))
    const { metadataDenormalized } = actionAsset;
    console.log(`Action Asset retreived is [${JSON.stringify(actionAsset)}]`);
    const requesterDetails = JSON.parse(await apiService.getUser({ ...userSession, payload: { userId: actionAsset.createdBy } }));
    console.log(`User Details retreived are [${JSON.stringify(requesterDetails)}]`);

    let requestTitle = metadataDenormalized.request_title;
    let notes = '';
    if (metadataDenormalized.reviewer_notes_public) {
      notes = metadataDenormalized.reviewer_notes_public;
    }
    if (metadataDenormalized.request_status === 'Done' || metadataDenormalized.request_status === 'Extension') {
      //...call the API
      let transformPayload = getTransformPayload(metadataDenormalized, notes, requesterDetails.emailId);
      console.log(`Transform Payload retrieved is [${JSON.stringify(transformPayload)}]`);

      let preSignedUrl = '';
      if (transformPayload) {
        const transformResponse = JSON.parse(await apiService.transform({ ...userSession, payload: transformPayload }));
        console.log(`Transform Response is [${JSON.stringify(transformResponse)}]`);

        let jobResponse;
        do {
          try {
            // Waiting for 5 seconds before retrieving the download transform job details
            await new Promise(resolve => setTimeout(resolve, 5000));
            jobResponse = JSON.parse(await apiService.getJob({ ...userSession, payload: { jobId: transformResponse.jobId } }));
            console.log(`Job Response received is [${JSON.stringify(jobResponse)}]`);
            if (jobResponse.jobStatus === 'Complete') {
              preSignedUrl = jobResponse.jobDocument.result.downloadUrl;
            }
          } catch (err) {
            console.error(`Problem in execution : ${err}`)
          }
        } while (preSignedUrl === '');
        console.log(`preSignedUrl generated is [${preSignedUrl}]`);
      }

      // Sending email using notification-api service
      const notificationParams = {
        sender: {
          name: '',
          email: process.env.SENDER_EMAIL,
        },
        method: API_CONSTANTS.NOTIFICATION_METHODS.EMAIL,
        feature: API_CONSTANTS.NOTIFICATION_FEATURES.DOWNLOAD_ORDER_COMPLETED,
        components: {
          id: objectId,
          title: requestTitle,
          message: preSignedUrl, // reusing message for the download link to avoid service changes
          recipients: [
            {
              name: requesterDetails.friendlyName || (requesterDetails.firstName + ' ' + requesterDetails.lastName),
              email: requesterDetails.emailId,
            }
          ]
        }
      };
      await JSON.parse(await apiService.postNotification({ ...userSession, payload: { body: notificationParams } }))

    } else if (metadataDenormalized.request_status === 'Cancelled') {
      // ...call the email service to inform user.
      // Sending email using notification-api service
      const notificationParams = {
        sender: {
          name: '',
          email: process.env.SENDER_EMAIL,
        },
        method: API_CONSTANTS.NOTIFICATION_METHODS.EMAIL,
        feature: API_CONSTANTS.NOTIFICATION_FEATURES.DOWNLOAD_ORDER_CANCELLED,
        components: {
          id: objectId,
          title: requestTitle,
          message: notes,
          recipients: [
            {
              name: requesterDetails.friendlyName || (requesterDetails.firstName + ' ' + requesterDetails.lastName),
              email: requesterDetails.emailId,
            }
          ]
        }
      };
      await JSON.parse(await apiService.postNotification({ ...userSession, payload: { body: notificationParams } }))
    } else {
      // Download order Assigned
      const newRequestAssignee = metadataDenormalized.assigned_to;
      if (newRequestAssignee) {
        // ...call the email service to inform user.
        const assigneeEmail = newRequestAssignee.match(/\((.*)\)/).pop();
        const assigneeName = (newRequestAssignee.replace(/\((.*)\)/, '')).trim();

        // Sending email using the notification-api service
        const notificationParams = {
          sender: {
            name: '',
            email: process.env.SENDER_EMAIL,
          },
          method: API_CONSTANTS.NOTIFICATION_METHODS.EMAIL,
          feature: API_CONSTANTS.NOTIFICATION_FEATURES.DOWNLOAD_ORDER_ASSIGNED,
          components: {
            id: objectId,
            idType: 'objectId',
            title: requestTitle,
            recipients: [
              {
                name: assigneeName,
                email: assigneeEmail,
              }
            ]
          }
        };
        await JSON.parse(await apiService.postNotification({ ...userSession, payload: { body: notificationParams } }))
      }
    }
    return makeResponse(200,
      JSON.stringify({
        statusCode: 200
      })
    )
  } catch (err) {
    console.error(`Problem in execution : ${err}`)
    return makeResponse(500, JSON.stringify({ error: err }))
  }
}
exports.handler = lambdaHandler
