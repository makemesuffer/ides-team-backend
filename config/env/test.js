module.exports = {

    models: {
        connection: 'mongoTest'
    },

    bootstrapTimeout: 15 * 60 * 1000,

    orm: {
        _hookTimeout: 15 * 60 * 1000
    },

    pubsub: {
        _hookTimeout: 15 * 60 * 1000
    },

    http: {
        customMiddleware(app) {
        },
        trustProxy: true,
    },

    session: {
        secure: true
    },

    appAddress: 'http://localhost:3001',

    cronInstance: process.env.CRON_INSTANCE,

    corpMail: {
        reports: 'test@ides24.com',
    },
}
