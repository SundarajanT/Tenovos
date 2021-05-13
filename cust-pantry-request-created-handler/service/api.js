const
    httpUtil = require('../util/http-util');
API_CONSTANTS = require('../constants/api-requests')


exports.getUser = async ({ apiURL, apiKey, accessToken, authorization, payload }) => {
    const headers = {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        "AccessToken": accessToken,
        "Authorization": authorization
    }
    let url = apiURL + API_CONSTANTS.URL.GET_USER + payload.userId;
    return httpUtil.sendHttpRequest(url, API_CONSTANTS.METHODS.GET, headers);
}

exports.getAsset = async ({ apiURL, apiKey, accessToken, authorization, payload }) => {
    const headers = {
        "X-API-Key": apiKey,
        "AccessToken": accessToken,
        "Authorization": authorization
    }
    let url = apiURL + API_CONSTANTS.URL.GET_ACTION + payload.objectId;
    return await httpUtil.sendHttpRequest(url, API_CONSTANTS.METHODS.GET, headers);
}
exports.updateAsset = async ({ apiURL, apiKey, accessToken, authorization, payload }) => {
    const headers = {
        "X-API-Key": apiKey,
        "AccessToken": accessToken,
        "Authorization": authorization
    }
    let url = apiURL + API_CONSTANTS.URL.ASSET + payload.objectId;
    return await httpUtil.sendHttpRequest(url, API_CONSTANTS.METHODS.PATCH, headers, payload.body);
}

exports.postNotification = async ({ apiURL, apiKey, accessToken, authorization, payload }) => {
    const headers = {
        "X-API-Key": apiKey,
        "AccessToken": accessToken,
        "Authorization": authorization
    }
    let url = apiURL + API_CONSTANTS.URL.POST_NOTIFICATION;
    return await httpUtil.sendHttpRequest(url, API_CONSTANTS.METHODS.POST, headers, payload.body);
}
