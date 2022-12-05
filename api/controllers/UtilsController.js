const { Constants } = sails.config.globals;
const shortid = require("shortid");
module.exports = {
  login: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { login } = req.body;
      console.log(login);
      const props = ["email", "password"];
      const missingProps = props.filter((item) => !(item in login));

      if (login && !missingProps.length) {
        const { success, reason } = await Accounts.checkInWithPassword(
          login.email,
          login.password
        );
        if (!success) return res.forbidden(reason);

        req.session.authenticated = reason;
        return res.ok(true, reason);
      }

      return res.badRequest({
        missingProps,
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },

  loginByPhone: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { login } = req.body;
      const props = ["phone", "password"];
      const missingProps = props.filter((item) => !(item in login));

      if (login && !missingProps.length) {
        const { success, reason } = await Accounts.loginByPhone(
          login.phone,
          login.password
        );
        if (!success) return res.forbidden(reason);

        req.session.authenticated = reason;

        const newDate = new Date();
        const dd = String(newDate.getDate()).padStart(2, "0");
        const mm = String(newDate.getMonth() + 1).padStart(2, "0"); //January is 0!
        const yyyy = newDate.getFullYear();
        const saveDate = mm + "-" + dd + "-" + yyyy;
        if (reason.profileType === "student") {
          const statistics = await Statistics.findOne().where({
            profileType: reason.profileType,
            accountId: reason.accountId,
            type: "1",
            ymd: saveDate,
          });
          if (!statistics) {
            await Statistics.create({
              profileType: reason.profileType,
              accountId: reason.accountId,
              type: "1",
            });
          }
          if (statistics) {
            const utc = Utils.date.utc();
            const filter = {
              statisticsId: statistics.statisticsId,
            };
            const props = {
              utc: utc,
            };

            await Statistics.fillIn(filter, props);
          }
          return res.ok(true, reason);
        }
        if (reason.profileType === "staff") {
          const statistics = await Statistics.findOne().where({
            profileType: reason.profileType,
            accountId: reason.accountId,
            type: "2",
            ymd: saveDate,
          });
          if (!statistics) {
            await Statistics.create({
              profileType: reason.profileType,
              accountId: reason.accountId,
              type: "2",
            });
          }
          if (statistics) {
            const utc = Utils.date.utc();
            const filter = {
              statisticsId: statistics.statisticsId,
            };
            const props = {
              utc: utc,
            };

            await Statistics.fillIn(filter, props);
          }
          return res.ok(true, reason);
        }
        if (reason.profileType === "parent") {
          const statistics = await Statistics.findOne().where({
            profileType: reason.profileType,
            accountId: reason.accountId,
            type: "3",
            ymd: saveDate,
          });
          if (!statistics) {
            await Statistics.create({
              profileType: reason.profileType,
              accountId: reason.accountId,
              type: "3",
            });
          }
          if (statistics) {
            const utc = Utils.date.utc();
            const filter = {
              statisticsId: statistics.statisticsId,
            };
            const props = {
              utc: utc,
            };

            await Statistics.fillIn(filter, props);
          }
          return res.ok(true, reason);
        } else return res.ok(true, reason);
      }

      return res.badRequest({
        missingProps,
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },

  logout: async (req, res) => {
    try {
      const locale = Locale("markers");
      const reason = req.session.authenticated;

      const newDate = new Date();
      const dd = String(newDate.getDate()).padStart(2, "0");
      const mm = String(newDate.getMonth() + 1).padStart(2, "0"); //January is 0!
      const yyyy = newDate.getFullYear();
      const saveDate = mm + "-" + dd + "-" + yyyy;
      if (reason.profileType === "student") {
        const statistics = await Statistics.findOne().where({
          profileType: reason.profileType,
          accountId: reason.accountId,
          type: "1",
          ymd: saveDate,
        });
        if (statistics) {
          const utc = Utils.date.utc();

          const time = utc - statistics.utc;

          const newTime = parseInt(statistics.time) + parseInt(time);
          const filter = {
            statisticsId: statistics.statisticsId,
          };
          const props = {
            time: newTime.toString(),
            utc: "0",
          };

          await Statistics.fillIn(filter, props);
        }
      }
      if (reason.profileType === "staff") {
        const statistics = await Statistics.findOne().where({
          profileType: reason.profileType,
          accountId: reason.accountId,
          type: "2",
          ymd: saveDate,
        });
        if (statistics) {
          const utc = Utils.date.utc();

          const time = utc - statistics.utc;

          const newTime = parseInt(statistics.time) + parseInt(time);
          const filter = {
            statisticsId: statistics.statisticsId,
          };
          const props = {
            time: newTime.toString(),
            utc: "0",
          };

          await Statistics.fillIn(filter, props);
        }
      }

      req.session.authenticated = null;
      return res.ok(true, { marker: locale.sessionDestroyed });
    } catch (e) {
      return res.error(e);
    }
  },

  returnSession: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { authenticated } = req.session;

      if (authenticated) return res.ok(true, authenticated);
      return res.ok(false, { marker: locale.noActiveSession });
    } catch (e) {
      return res.error(e);
    }
  },

  requestPasswordResetLink: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { requestPasswordReset = {} } = req.body;

      const props = ["email", "newPassword"];
      const missingProps = props.filter(
        (item) => !(item in requestPasswordReset)
      );
      if (requestPasswordReset && !missingProps.length) {
        const { success, reason } = await Accounts.requestPasswordResetLink(
          requestPasswordReset.email,
          requestPasswordReset.newPassword,
          Locale(req)
        );
        if (success)
          return res.ok(true, { marker: locale.resetLinkHasBeenSent });

        return res.ok(false, reason);
      }

      return res.badRequest({
        missingProps,
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },

  passwordReset: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { passwords, accountId } = req.body;
      if (passwords) {
        const acc = await Accounts.findOne({ accountId: accountId });
        if (
          passwords.newPassword &&
          passwords.newPasswordConfirmation &&
          accountId
        ) {
          if (passwords.newPassword === passwords.newPasswordConfirmation) {
            const filter = { accountId: acc.accountId };
            const props = { password: passwords.newPasswordConfirmation };

            await Accounts.fillIn(filter, props);
            return res.ok();
          }
          return res.badRequest({
            missingProps: ["Пароли не совпадают"],
            marker: "Пароли не совпадают",
          });
        }
      }

      return res.badRequest({
        missingProps: ["Введите пароль"],
        marker: "Введите пароль",
      });
    } catch (e) {
      return res.error(e);
    }
  },

  resetPassword: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { email } = req.body;

      if (email) {
        const acc = await Accounts.findOne({ email: email });
        if (!acc) {
          return res.badRequest("Такого аккаунта не существует");
        }
        const password = shortid.generate();
        const filter = { accountId: acc.accountId };
        const props = { password: password };
        await Mail.send(
          email,
          "Восстановление пароля на платформе Ides24",
          "Ваш новый пароль: " + password
        );

        await Accounts.fillIn(filter, props);
        return res.ok();
      }

      return res.badRequest({
        missingProps: ["resetHash"],
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },

  getDate: (req, res) => {
    try {
      return res.ok(true, Utils.date.utc());
    } catch (e) {
      return res.error(e);
    }
  },

  signStorageUrl: async (req, res) => {
    try {
      const { filePathName } = req.params;

      if (filePathName) {
        const { success, reason } = await S3.signUrl(filePathName);
        if (!success) return res.badRequest(reason);

        return res.ok(true, reason);
      }

      return res.badRequest({
        missingProps: "filePathName",
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },

  systemUpdatesChannel: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { action } = req.params;

      if (req.isSocket && req.session.authenticated && action) {
        const { institutionId, accountId } = req.session.authenticated;
        const socketId = sails.sockets.getId(req);
        const roomName = Sockets.makeRoomName(
          Constants.systemUpdates,
          accountId
        );

        if (action === Constants.subscribe) {
          const { success, reason } = await Sockets.join(socketId, roomName, {
            institutionId,
            accountId,
          });
          if (!success) return res.badRequest(reason);

          return res.ok(true, reason);
        }

        if (action === Constants.unsubscribe) {
          const { success, reason } = await Sockets.leave(socketId, roomName, {
            institutionId,
            accountId,
          });
          if (!success) return res.badRequest(reason);

          return res.ok(true, reason);
        }

        return res.badRequest(locale.wrongActionType);
      }

      if (!action) return res.badRequest(locale.requestMissingRequiredProps);
      return res.badRequest(locale.authorisedSocketsOnly);
    } catch (e) {
      return res.error(e);
    }
  },

  bootstrapDemo: async (req, res) => {
    try {
      const locale = Locale("markers");
      Boot.prepareDb();

      return res.ok(true, locale.preparingDemo);
    } catch (e) {
      return res.error(e);
    }
  },
};
