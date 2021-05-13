/* eslint-disable prefer-destructuring */
/* eslint-disable no-unused-vars */
/* eslint-disable func-names */

const AWS = require('aws-sdk');
let awsConfig = require('aws-config');
const https = require('https');

var SlackWebhook = require('slack-webhook');
 
var slack = new SlackWebhook(`${process.env.SLACK_WEB_HOOK}`);

// Tenovos Acct Keys
const tnvsAccessKeyId = process.env.TNVS_ACCESS_KEY_ID
const tnvsSecretAccessKey = process.env.TNVS_SECRET_ACCESS_KEY

AWS.config.update({ region: process.env.Region || 'us-east-1' });

// ---------------------------------------------------------------

const makeResponse = (statusCode, message) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message }),
  }
}

const lambdaHandler = async (apiEvent, context) => {
  console.info(`API EVENT: \n${JSON.stringify(apiEvent, null, 2)}`)

  console.info(`${process.env.SLACK_WEB_HOOK}`)

  slack.send('RECEIVED EVENT').then(function (res) {
    // succesful request
  }).catch(function (err) {
    // handle request error
  })
  try {
    // ************ Get the body ************
    const event = typeof apiEvent.body === 'string' ? JSON.parse(apiEvent.body) : apiEvent.body

    // ************ Read message .. for Tenovos Events .. get the message and objectId ************
    const message = typeof event.Message === 'string' ? JSON.parse(event.Message) : event.Message
    const { data: { objectId }, customerId, action } = message
    console.info(`Object Id : ${objectId} .. Customer Id : ${customerId} ... Action : ${action}`)
    // Set the customerId on the message.data
    message.data.customerId = customerId

    // ************ Post to INTEG SQS ************
    // Set SQS if keys are given .. otherwise the queue should be on the same aws account
    if (apiEvent.sqsAcctKeys) sqs = new AWS.SQS(awsConfig(apiEvent.sqsAcctKeys))

    // Determine the SQS queue to push the message
    let messageToPost = message.data

    console.info(`SQS Message Posted : ${sqsPostResp.MessageId}`)

    return makeResponse(200,
      JSON.stringify({
        postedMessage: messageToPost,
        postedMessageId: sqsPostResp.MessageId
      })
    )

  } catch (err) {
    console.error(`Problem in execution : ${err}`)
    return makeResponse(500, JSON.stringify({ error: err }))
  }

}

exports.handler = lambdaHandler
