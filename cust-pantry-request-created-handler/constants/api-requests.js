module.exports = Object.freeze({
    URL: {
        BASE: process.env.API_URL,
        AUTHENTICATION: "/auth/token",
        GET_USER: '/user/',
        ASSET: "/asset/",
        GET_ACTION: "/action/",
        POST_NOTIFICATION: "/post-notification/",
    },
    METHODS: {
        POST: "POST",
        GET: "GET",
        PATCH: "PATCH"
    },
    NOTIFICATION_METHODS: {
        EMAIL: "email"
    },
    NOTIFICATION_FEATURES: {
        DOWNLOAD_ORDER_RECEIVED: "download-order-received"
    }
})