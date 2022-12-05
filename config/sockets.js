const fs = require("fs");

module.exports.sockets = {
  //adapter: "@sailshq/socket.io-redis",
  host: process.env.REDIS_HOST || "localhost", //fs.readFileSync('./certs/redisHost', 'utf8'),
  port: process.env.REDIS_PORT || fs.readFileSync("./certs/redisPort", "utf8"),
  pass: process.env.REDIS_PASS || fs.readFileSync("./certs/redisPass", "utf8"),

  beforeConnect: function (handshake, cb) {
    // `true` allows the connection

    // sails.log.info('socketin is trying to connect')
    return cb(null, true);

    // (`false` would reject the connection)
  },

  afterDisconnect: async (session, socket, cb) => {
    try {
      const hasDisconnected = await Sockets.findOne({ socketId: socket.id });
      if (hasDisconnected) await Sockets.destroy({ socketId: socket.id });

      return cb();
    } catch (e) {
      sails.log.error(e);

      return cb();
    }
  },
};
