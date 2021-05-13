/* eslint-disable prefer-destructuring */
/* eslint-disable no-unused-vars */
/* eslint-disable func-names */

const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-1' });
const apiService = require('./service/api');
const moment = require('moment');
const API_CONSTANTS = require('./constants/api-requests');

const makeResponse = (statusCode, message) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message }),
  }
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
    console.log(`User Session retreived is [${JSON.stringify(userSession)}]`);
    const actionAsset = JSON.parse(await apiService.getAsset({ ...userSession, payload: { objectId } }));
    console.log(`Action Asset retreived is [${JSON.stringify(actionAsset)}]`);
    const requesterDetails = JSON.parse(await apiService.getUser({ ...userSession, payload: { userId: actionAsset.createdBy } }));
    console.log(`User Details retreived are [${JSON.stringify(requesterDetails)}]`);

    const { metadataDenormalized } = actionAsset;
    // Assigning the Reviewer Security Template
    const reviewerSecurityTemplate = process.env.REVIEWER_SECURITY_TEMPLATE;
    const submittedMetadataDefintionId = process.env.SUBMITTED_BY_METADATA_DEFINITION_ID
    const updateAssetReqBody = {
      securityTemplateIds: [
        reviewerSecurityTemplate
      ],
      metadata: [
        ...metadataDocument, {
          metadataDefinitionId: submittedMetadataDefintionId,
          metadataDefinitionValue: requesterDetails.emailId
        }
      ]
    }
    await JSON.parse(await apiService.updateAsset({ ...userSession, payload: { body: updateAssetReqBody, objectId } }))

    const requestTitle = metadataDenormalized.request_title;
    // Sending email using the notification api
    const notificationParams = {
      feature: API_CONSTANTS.NOTIFICATION_FEATURES.DOWNLOAD_ORDER_RECEIVED,
      method: API_CONSTANTS.NOTIFICATION_METHODS.EMAIL,
      sender: {
        name: '',
        email: process.env.SENDER_EMAIL
      },
      components: {
        title: requestTitle,
        recipients: [
          {
            name: requesterDetails.friendlyName || (requesterDetails.firstName + ' ' + requesterDetails.lastName),
            email: requesterDetails.emailId
          }
        ],
        id: objectId
      }
    }
    console.log(`Notification parameters generated are [${JSON.stringify(notificationParams)}]`);
    await JSON.parse(await apiService.postNotification({ ...userSession, payload: { body: notificationParams } }));
    console.log(`Email API Service invoked`);
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
