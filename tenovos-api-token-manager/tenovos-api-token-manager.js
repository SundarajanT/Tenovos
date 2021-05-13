/* eslint-disable prefer-destructuring */
/* eslint-disable no-unused-vars */
/* eslint-disable func-names */

const AWS = require('aws-sdk');
const apiService = require('./service/api');
const { awsSecretManagerService } = require('./config/secrets-manager');

let cache = {
  
}
const processCacheRecord = function (k) {
  return cache[k];
}
const addCacheRecord = function (k, v) {
  cache[k] = v;
}

const makeResponse = (statusCode, body) => {
  return {
    statusCode: 200,
    body
  }
}

const lambdaHandler = async (apiEvent, context) => {
  console.info(`API EVENT: \n${JSON.stringify(apiEvent, null, 2)}`)
  const event = typeof apiEvent.body === 'string' ? JSON.parse(apiEvent.body) : apiEvent.body
  const { customerId } = event;

  if (!customerId) {
    throw new Error('No CustomerId Provided');
  }

  try {
    let userSession, apiSecrets;
    if (!cache[customerId]) {
      apiSecrets = await awsSecretManagerService(`customerId_${customerId}`)
      userSession = JSON.parse(await apiService.getAuthToken(apiSecrets)).session;
      userSession.validUntil = (new Date()).getTime() + (30 * 60 * 1000);
      userSession = { ...userSession, apiKey: apiSecrets.apiKey, apiURL: apiSecrets.apiURL }
      addCacheRecord(customerId, userSession);
    } else {
      userSession = processCacheRecord(customerId);
      const now = new Date().getTime();
      const isValid = ((userSession.validUntil || 0) - now) > 0
      if (isValid) {
        console.info('>>>>>>>>>>> User session is valid');
      } else {
        apiSecrets = await awsSecretManagerService(`customerId_${customerId}`)
        console.info('>>>>>>>>>>> User session is not valid. Refreshing the current user session');
        userSession = JSON.parse(await apiService.refreshAuthToken({ ...apiSecrets, refreshToken: userSession.refreshToken, accessToken: userSession.accessToken })).session;
        userSession.validUntil = (new Date()).getTime() + (30 * 60 * 1000);
        userSession = { ...userSession, apiKey: apiSecrets.apiKey, apiURL: apiSecrets.apiURL }
      }
    }

    return makeResponse(200,
      JSON.stringify({
        session: userSession,
        statusCode: 200
      })
    )
  } catch (err) {
    console.error(`Problem in execution : ${err}`)
    return makeResponse(500, JSON.stringify({ error: err }))
  }

}

exports.handler = lambdaHandler
