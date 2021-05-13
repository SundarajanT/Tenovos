const Logger = require('log-winston-aws-level');
const Request = require('request');
const fs = require('fs');

function setLogLevel(level) {
  Logger.updateLevel(level);
}

async function sendHttpRequest(url, method, headers, body) {
  return new Promise(async (resolve, reject) => {
    let postBody = '';

    if (body) {
      if (typeof body === 'object') {
        postBody = JSON.stringify(body);
      } else if (typeof body === 'string') {
        postBody = body;
      }
    }

    if (!headers) {
      // eslint-disable-next-line no-param-reassign
      headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postBody),
      };
    } else if (!headers['Content-Length']) {
      // eslint-disable-next-line no-param-reassign
      headers['Content-Length'] = Buffer.byteLength(postBody);
    }

    const options = {
      url,
      method,
      headers,
      body: postBody,
    };
    if (Logger.currentLevel() === 'debug') {
      Logger.debug(`HTTP Request: ${JSON.stringify(options)}`);
    }

    Request(options, (error, response, responseBody) => {
      if (error) {
        Logger.error(`Error Response: ${JSON.stringify(response)}`);
        Logger.error(`Error Response Body: ${responseBody}`);
        Logger.error(`Error Response Error: ${error}`);
        reject(error);
      } else if (!error && response.statusCode === 200) {
        if (Logger.currentLevel() === 'debug') {
          Logger.debug(`Success Response (${response.statusCode}, ${response.statusMessage}) Body: ${responseBody}`);
        }
        resolve(responseBody);
      } else {
        Logger.info(`Other Response: ${JSON.stringify(response)}`);
        Logger.info(`Other Response Body: ${responseBody}`);
        Logger.info(`Other Response Error: ${error}`);
        reject(responseBody);
      }
    });
  });
}

module.exports = {
  sendHttpRequest,
  setLogLevel,
  Request,
  fs,
};