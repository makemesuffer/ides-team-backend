const nodemailer = require("nodemailer");

module.exports = {
  send: async function (to, subject, text) {
    return new Promise((resolve) => {
      const from = "notification.ides24@gmail.com";

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        //secure: true,
        auth: {
          user: "notification.ides24",
          pass: "tybvi5-qyzXuc-fywhec",
        },
        debug: true,
      });

      transporter.sendMail({ from, to, subject, text }, (e) => {
        if (e) resolve({ success: false, reason: e });
        resolve({ success: true });
      });
    });
  },

  reports: sails.config.corpMail.reports,
};
