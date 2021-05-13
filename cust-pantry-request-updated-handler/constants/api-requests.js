module.exports = Object.freeze({
    URL: {
        BASE: process.env.API_URL,
        AUTHENTICATION: "/auth/token",
        GET_USER: '/user/',
        ASSET: "/asset/",
        GET_ACTION: "/action/",
        TRANSFORM: "/asset/transform",
        POST_NOTIFICATION: "/post-notification/",
        GET_JOB: "/job/",
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
        DOWNLOAD_ORDER_ASSIGNED: "download-order-assigned",
        DOWNLOAD_ORDER_CANCELLED: "download-order-cancelled",
        DOWNLOAD_ORDER_COMPLETED: "download-order-completed"
    }
})