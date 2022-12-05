const fs = require("fs");

module.exports.session = {
  secret: "af0158401ae5da77824050408de7ca99",
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
  },
  adapter: "mongo",
  collection: "sessions",
  stringify: true,
  url: (
    process.env.MONGO_URL || fs.readFileSync("./certs/mongoStd", "utf8")
  ).replace(/(aMark)|(cMark)|(qMark)/g, (st, aMark, cMark) => {
    if (aMark) return "&";
    if (cMark) return ",";
    return "?";
  }),
};
