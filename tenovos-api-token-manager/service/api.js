const
    httpUtil = require('../util/http-util');
API_CONSTANTS = require('../constants/api-requests')


exports.getAuthToken = async ({ clientId, apiKey, apiURL, username, password }) => {
    const headers = {
        "X-API-Key": apiKey,
        "Content-Type": "application/json"
    }
    body = {
        clientId,
        username,
        password,
    }
    let url = apiURL + API_CONSTANTS.URL.AUTHENTICATION;
    return httpUtil.sendHttpRequest(url, API_CONSTANTS.METHODS.POST, headers, body);
}

exports.refreshAuthToken = async ({ apiKey, apiURL, accessToken, refreshToken }) => {
    const headers = {
        "X-API-Key": apiKey,
        "Content-Type": "application/json"
    }
    body = {
        session: {
            accessToken,
            refreshToken
        }
    }
    let url = apiURL + API_CONSTANTS.URL.AUTHENTICATION;
    return httpUtil.sendHttpRequest(url, API_CONSTANTS.METHODS.POST, headers, body);
}