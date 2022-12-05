module.exports = {
  models: {
    connection: "mongoDev",
  },

  bootstrapTimeout: 15 * 60 * 1000,

  orm: {
    _hookTimeout: 15 * 60 * 1000,
  },

  pubsub: {
    _hookTimeout: 15 * 60 * 1000,
  },

  http: {
    customMiddleware(app) {},
  },

  session: {},

  appAddress: "http://localhost:3001",

  cronInstance: "dev",
  baseURL: "/фзш",
  corpMail: {
    reports: "devreports@ides24.com",
  },
};
