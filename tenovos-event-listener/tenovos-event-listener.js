/* eslint-disable prefer-destructuring */
/* eslint-disable no-unused-vars */
/* eslint-disable func-names */

const AWS = require('aws-sdk');
let awsConfig = require('aws-config');
const https = require('https');

// Tenovos Acct Keys
const tnvsAccessKeyId = process.env.TNVS_ACCESS_KEY_ID
const tnvsSecretAccessKey = process.env.TNVS_SECRET_ACCESS_KEY

AWS.config.update({ region: process.env.Region || 'us-east-1' });

// Use provided keys for Dynamo access
const dynamo = new AWS.DynamoDB.DocumentClient(awsConfig({
  accessKeyId: tnvsAccessKeyId, 
  secretAccessKey: tnvsSecretAccessKey
}));
let sqs = new AWS.SQS();

// ---------------------------------------------------------------

const makeResponse = (statusCode, message) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message }),
  } 
}

const callSubscriptionUrl = (url) => {
  return new Promise(resolve => {
    https.get(url, (resp) => {
      let data = ''
      resp.on('data', (chunk) => { data += chunk })
      resp.on('end' , () => { 
        console.log(`END DATA : ${data}`)
        resolve()
      })
    })
    .on("error", (err) => {
      console.log("Error in callSubscriptionUrl : " + err.message)
      resolve()
    })
  })
}

const lambdaHandler = async (apiEvent, context) => {
  // console.log(`ENVIRONMENT VARIABLES\n${JSON.stringify(process.env, null, 2)}`)
  console.info(`API EVENT: \n${JSON.stringify(apiEvent, null, 2)}`)

  try {
    // ************ Get the body ************
    const event = typeof apiEvent.body === 'string' ? JSON.parse(apiEvent.body) : apiEvent.body

    // ************ Auto Subscribe ************
    if (event.Type === 'SubscriptionConfirmation'){
      // console.log(`Calling  Subscribe URL : ${event.SubscribeURL}`)
      await callSubscriptionUrl(event.SubscribeURL)
      return makeResponse(200, `Done - Calling SubscriptionUrl`)
    }

    // ************ Read message .. for Tenovos Events .. get the message and objectId ************
    const message = typeof event.Message === 'string' ? JSON.parse(event.Message) : event.Message
    const { data: { objectId }, customerId, action } = message
    console.info(`Object Id : ${objectId} .. Customer Id : ${customerId} ... Action : ${action}`)
    // Set the customerId on the message.data
    message.data.customerId = customerId

    // ************ Enrich Message with metadata : Get the metadataDocument for the Object Id ************
    const qryObjectParams = {
      TableName: 'master-object-metadata',
      KeyConditionExpression: 'objectId = :objectId',
      ExpressionAttributeValues: {
        ':objectId': objectId,
      },
      ProjectionExpression: 'metadataDocument, metadataTemplateId'
    };
    const masterObjectResp = await dynamo.query(qryObjectParams).promise()
    if (!masterObjectResp || !masterObjectResp.Items || !masterObjectResp.Items.length 
      || !masterObjectResp.Items[0].metadataDocument) throw Error(`No Master Object found`)
    
    // Fix the metadataDocument ...........
    const fixedMdMap = {}
    JSON.parse(masterObjectResp.Items[0].metadataDocument).map(a => {
      fixedMdMap[a.metadataDefinitionId] = {
        metadataDefinitionId: a.metadataDefinitionId
      }
      if (a.metadataDefinitionValue) fixedMdMap[a.metadataDefinitionId].metadataDefinitionValue = a.metadataDefinitionValue
      else if (a.metadataDefinitionTableValue) fixedMdMap[a.metadataDefinitionId].metadataDefinitionTableValue = a.metadataDefinitionTableValue
    })
    const fixedMdAry = []
    Object.keys(fixedMdMap).map(k => fixedMdAry.push(fixedMdMap[k]))
    // ........... ........... ............

    message.data.metadataDocument = fixedMdAry
    message.data.metadataTemplateId = masterObjectResp.Items[0].metadataTemplateId

    // ************ Post to INTEG SQS ************
    // Set SQS if keys are given .. otherwise the queue should be on the same aws account
    if (apiEvent.sqsAcctKeys) sqs = new AWS.SQS(awsConfig(apiEvent.sqsAcctKeys))


    // Determine the SQS queue to push the message
    let messageToPost = message.data
    let integSqsUrl = undefined
    const downloadRequestTemplateId = process.env.DOWNLOAD_REQUEST_ACTION_TEMPLATE_ID;
    if (apiEvent.integSqsUrl) integSqsUrl = apiEvent.integSqsUrl
    else if (action === 'action') {
      if (message.data.metadataTemplateId === 'c7f77b15-b1af-455c-b784-187575d870e9') 
        integSqsUrl = process.env[`integSqsUrl_${customerId}_${action}`]
      else if (message.data.metadataTemplateId === downloadRequestTemplateId) {
          integSqsUrl = process.env[`integSqsUrl_${customerId}_${action}`]
      }
      else console.log('The Action Template Id is not mapped to a SQS .. ignoring the message')     
    }
    else if (customerId) {
      if (customerId === '1591685305129') { // Fuse
        // Add the externalId if exists
        let externalId = 'NOT-AVAILABLE'
        const externalIdAttr = message.data.metadataDocument
          .find(attr => attr.metadataDefinitionId === '87c65874-0bd1-4664-86a9-6f56ed011b37')
        if (externalIdAttr) externalId = externalIdAttr.metadataDefinitionValue
        console.log(`PVM - External Id : ${externalId}`)
        message.data.externalId = externalId

        // Set SQS queue
        integSqsUrl = process.env[`integSqsUrl_${customerId}`]

        // Set the messageToPost
        messageToPost = message
      }
      else if (customerId === '1591685730792') { // CTC .. attachFile or update .. Switch based on action
        let skuEntryTable
        switch (action) {
          case 'attachFile':
            // Get the SKU Entry Table
            skuEntryTable = message.data.metadataDocument.find(a => a.metadataDefinitionId === 'd9cb7f63-6b58-4531-8704-41e95c416c95')
            if (skuEntryTable) integSqsUrl = process.env[`integSqsUrl_${customerId}_sku_publisher`]
            else {
              console.log(`No SKU Entry Table available for ${objectId}`)
              return makeResponse ( 200, JSON.stringify({ message: `No SKU Entry Table available for ${objectId}` }) )
            }
            break;

          case 'update':
            // Inspect SKU Entry changes
            let skuEntryChanged = 
              message.data.capturedChanges != null && 
              message.data.capturedChanges.metadataDocument != null && 
              message.data.capturedChanges.metadataDocument.primary_sku_entry != null
            if (!skuEntryChanged) {
              console.log(`No changes to SKU Entry Table detected for ${objectId}`)
              return makeResponse ( 200, JSON.stringify({ message: `No changes to SKU Entry Table detected for ${objectId}` }) )
            }

            // Get the SKU Entry Table
            skuEntryTable = message.data.metadataDocument.find(a => a.metadataDefinitionId === 'd9cb7f63-6b58-4531-8704-41e95c416c95')
            if (skuEntryTable) integSqsUrl = process.env[`integSqsUrl_${customerId}_sku_publisher`]
            else {
              console.log(`No SKU Entry Table available for ${objectId}`)
              return makeResponse ( 200, JSON.stringify({ message: `No SKU Entry Table available for ${objectId}` }) )
            }            
            break;
        }
      }
      else if (customerId === '1591685891187' && action === 'update') { // Google - Pantry .. Only listen for "update"
        let metadataDocument =  message.data && message.data.capturedChanges && message.data.capturedChanges.metadataDocument;
        if (metadataDocument) {
          const { request_status, assigned_to } = metadataDocument;
          if (request_status === 'Done' || request_status === 'Cancelled' || assigned_to) {
            integSqsUrl = process.env[`integSqsUrl_${customerId}_${action}`]
          } else {
            throw new Error(`No Action Required: ${customerId} - action: ${action}`)
          }
        }
      }
      // Otherwise just send to Customer queue
      else integSqsUrl = process.env[`integSqsUrl_${customerId}`]
    }
    console.log(`Using INTEG SQS QUEUE : ${integSqsUrl}`)

    // Check and post to the queue
    if (!integSqsUrl) throw new Error(`No SQS queue defined for Customer: ${customerId} - action: ${action}`)
    const sqsPostParams = {
      DelaySeconds: 10,
      MessageBody: JSON.stringify(messageToPost),
      QueueUrl: integSqsUrl
    }
    const sqsPostResp = await sqs.sendMessage(sqsPostParams).promise()
    console.info(`SQS Message Posted : ${sqsPostResp.MessageId}`)

    return makeResponse ( 200,
      JSON.stringify({
        postedMessage: messageToPost,
        postedMessageId: sqsPostResp.MessageId
      })
    )

  } catch (err) {
    console.error(`Problem in execution : ${err}`)
    return makeResponse(500, JSON.stringify({ error: err }) )
  }

}

exports.handler = lambdaHandler
