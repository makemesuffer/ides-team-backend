const shortid = require("shortid");
const _ = require("lodash");
const { Constants } = sails.config.globals;

module.exports = {
  attributes: {
    profileType: {
      type: "string",
      required: true,
      enum: [
        Constants.student,
        Constants.parent,
        Constants.staff,
        Constants.schoolAdmin,
        Constants.idesAdmin,
      ],
    },
    accountId: {
      type: "string",
    },
    statisticsId: {
      type: "string",
    },
    type: {
      type: "string",
    },
    time: {
      type: "string",
      defaultsTo: "0",
    },
    utc: {
      type: "string",
    },
    ymd: {
      type: "string",
    },
  },

  // lifecycle

  beforeCreate: async (statistics, next) => {
    try {
      statistics.statisticsId = shortid.generate();

      const newDate = new Date();
      const dd = String(newDate.getDate()).padStart(2, "0");
      const mm = String(newDate.getMonth() + 1).padStart(2, "0"); //January is 0!
      const yyyy = newDate.getFullYear();
      const saveDate = mm + "-" + dd + "-" + yyyy;
      statistics.utc = Utils.date.utc();
      statistics.ymd = saveDate;

      next();
    } catch (e) {
      next(e);
    }
  },

  validateUpdate: async (req, filter, props) => {
    try {
      const records = await NativeQuery.find(Statistics, filter);
      if (!records.length) return { success: false, reason: "noRecordsFound" };

      const allValidations = [];
      records.forEach((r) =>
        allValidations.push(
          new Promise(async (resolve) => {
            const checkRules = _.omit(
              Faculties.commonRules(req, { ...r, ...props }, "update"),
              ["boundToDestroy"]
            );
            const failedChecks = {};
            const checks = [];

            for (const prop in {
              ...checkRules,
              ...props,
            }) {
              if (checkRules[prop]) {
                checks.push(
                  new Promise(async (resolve) => {
                    const test = await checkRules[prop].test();
                    if (Utils.type.isBoolean(test) && test) return resolve();

                    const { success, reason } = test;
                    if (success) return resolve();

                    failedChecks[prop] = { warning: checkRules[prop].warning };
                    if (reason)
                      failedChecks[prop] = { ...failedChecks[prop], ...reason };

                    resolve({ ...failedChecks[prop] });
                  })
                );
              }
            }

            await Promise.all(checks);
            if (Object.keys(failedChecks).length) resolve({ success: true });
          })
        )
      );

      const result = await Promise.all(allValidations);
      const recordsWithFailedChecks = result.filter((r) => !r.success);

      if (recordsWithFailedChecks.length)
        return {
          success: false,
          reason:
            recordsWithFailedChecks.length == 1
              ? recordsWithFailedChecks[0].failedChecks
              : recordsWithFailedChecks,
        };
      return { success: true };
    } catch (e) {
      return { success: false, reason: e };
    }
  },
  fillIn: async (filter, props) => {
    try {
      if (props.populated) throw new Error("doNotFillInPopulated");

      const records = await NativeQuery.find(Statistics, filter);
      if (!records.length) return { success: false, reason: "noRecordsFound" };
      const updateReqs = [];

      records.forEach((r) =>
        updateReqs.push(
          new Promise(async (resolve, reject) => {
            Object.keys(props).forEach((path) => _.set(r, path, props[path]));

            const updated =
              (await Statistics.update(
                { statisticsId: r.statisticsId },
                { ...r }
              ).catch((e) => reject(e))) || [];
            resolve(updated.length === 1 ? updated[0] : updated);
          })
        )
      );

      const result = await Promise.all(updateReqs);
      return { success: true, reason: result.length == 1 ? result[0] : result };
    } catch (e) {
      return { success: false, reason: e };
    }
  },

  // repository
};
