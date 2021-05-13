module.exports = Object.freeze({
    URL: {
        BASE: process.env.API_URL,
        AUTHENTICATION: "/auth/token"
    },
    METHODS: {
        POST: "POST",
        GET: "GET",
        PATCH: "PATCH"
    }
})