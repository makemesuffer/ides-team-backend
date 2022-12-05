const shortid = require("shortid");
const _ = require("lodash");
const { Constants } = sails.config.globals;

module.exports = {
  attributes: {
    assignmentName: {
      type: "string",
      required: true,
    },
    belongsToGroup: {
      type: "string",
      required: true,
    },
    belongsToInstructor: {
      type: "string",
      required: true,
    },
    belongsToDiscipline: {
      type: "string",
      required: true,
    },
    topic: {
      type: "string",
      required: true,
    },
    format: {
      type: "string",
      enum: [Constants.test, Constants.file, Constants.text],
      required: true,
    },
    content: {
      type: "json",
      required: true,
    },
    materials: {
      type: "json",
      defaultsTo: [],
    },
    submissions: {
      type: "json",
      defaultsTo: {},
      // [accountId]: {
      //      solution: {},
      //      discussion: [messageId],
      //      status: {
      //          enum: [Constants.pending, Constants.reviewed]
      //      }
      // }
    },
    // utc based timeslot
    startDate: {
      type: "string",
      required: true,
    },
    endDate: {
      type: "string",
      required: true,
    },
    additionalInfo: {
      type: "json",
      defaultsTo: {},
    },
    // meta
    institutionId: {
      type: "string",
      required: true,
    },
    assignmentId: {
      type: "string",
    },
    utc: {
      type: "string",
    },
    ymd: {
      type: "string",
    },
  },

  // lifecycle

  beforeCreate: async (assignment, next) => {
    try {
      assignment.assignmentId = shortid.generate();

      assignment.utc = Utils.date.utc();
      assignment.ymd = Utils.date.ymd();

      next();
    } catch (e) {
      next(e);
    }
  },

  // repository

  fetch: async (query = {}) => {
    try {
      let params = {};

      if (query.filter) params.where = query.filter;
      if (query.limit) params.limit = Number(query.limit);
      if (query.skip) params.skip = Number(query.skip);

      params.sort = `${_.get(query, "sort.by", "utc")} ${_.get(
        query,
        "sort.asc",
        "DESC"
      )}`;
      let records = await NativeQuery.find(Assignments, params.where, {
        ...params,
      });

      if (query.populate)
        records = await Promise.all(
          records.map((r) => Assignments.populate(r))
        );
      return { success: true, reason: records };
    } catch (e) {
      return { success: false, reason: e };
    }
  },

  fillIn: async (filter, props) => {
    try {
      if (props.populated) throw new Error("doNotFillInPopulated");

      const records = await NativeQuery.find(Assignments, filter);
      if (!records.length) return { success: false, reason: "noRecordsFound" };
      const updateReqs = [];

      records.forEach((r) =>
        updateReqs.push(
          new Promise(async (resolve, reject) => {
            Object.keys(props).forEach((path) => _.set(r, path, props[path]));

            const updated =
              (await Assignments.update(
                { assignmentId: r.assignmentId },
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

  populate: async (record) => {
    try {
      let populated = { ...record, populated: true };
      let reqs = [];

      // institutionId ref
      reqs.push(
        new Promise(async (resolve) => {
          const institution =
            (await Institutions.findOne({
              institutionId: record.institutionId,
            })) || null;
          populated.institution = institution;
          resolve({ institution });
        })
      );

      // belongsToDiscipline ref
      reqs.push(
        new Promise(async (resolve) => {
          const discipline =
            (await Disciplines.findOne({
              disciplineId: record.belongsToDiscipline,
            })) || null;
          populated.discipline = discipline;
          resolve({ discipline });
        })
      );

      // belongsToInstructor ref
      reqs.push(
        new Promise(async (resolve) => {
          const instructor =
            (await Accounts.findOne({
              accountId: record.belongsToInstructor,
            })) || null;
          populated.instructor = instructor;
          resolve({ instructor });
        })
      );

      await Promise.all(reqs);
      return { ...populated };
    } catch (e) {
      return { success: false, reason: e };
    }
  },

  getRelated: async (record) => {
    const criteria = { assignmentId: record.assignmentId };

    const related = {};

    return related;
  },

  // validation

  validateCreate: async (req, assignment) => {
    try {
      const checkRules = _.omit(
        Assignments.commonRules(req, assignment, "create"),
        ["boundToDestroy"]
      );
      const failedChecks = {};
      const checks = [];

      for (const prop in {
        ...checkRules,
        ...assignment,
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
      if (Object.keys(failedChecks).length)
        return { success: false, reason: failedChecks };

      return { success: true };
    } catch (e) {
      return { success: false, reason: e };
    }
  },

  validateUpdate: async (req, filter, props) => {
    try {
      const records = await NativeQuery.find(Assignments, filter);
      if (!records.length) return { success: false, reason: "noRecordsFound" };

      const allValidations = [];
      records.forEach((r) =>
        allValidations.push(
          new Promise(async (resolve) => {
            const checkRules = _.omit(
              Assignments.commonRules(req, { ...r, ...props }, "update"),
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
            if (Object.keys(failedChecks).length)
              return resolve({ failedChecks, assignmentId: r.assignmentId });
            resolve({ success: true });
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

  validateDestroy: async (req, assignmentId) => {
    try {
      const assignment = await Assignments.findOne({ assignmentId });
      if (!assignment) return { success: false, reason: "noRecordsFound" };

      const checkRules = _.pick(
        { ...Assignments.commonRules(req, assignment, "delete") },
        ["accessRights", "boundToDestroy"]
      );
      const failedChecks = {};
      const checks = [];

      for (const prop in {
        ...checkRules,
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
      if (Object.keys(failedChecks).length)
        return {
          success: false,
          reason: failedChecks,
        };
      return { success: true };
    } catch (e) {
      return { success: false, reason: e };
    }
  },

  validateList: async (req, query) => {
    try {
      const records = await NativeQuery.find(Assignments, query.filter);

      const allValidations = [];
      records.forEach((r) =>
        allValidations.push(
          new Promise(async (resolve) => {
            const checkRules = _.pick(
              { ...Assignments.commonRules(req, r, "list") },
              ["accessRights"]
            );
            const failedChecks = {};
            const checks = [];

            for (const prop in {
              ...checkRules,
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
            if (Object.keys(failedChecks).length)
              return resolve({ failedChecks, assignmentId: r.assignmentId });
            resolve({ success: true });
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

  commonRules: (req, assignment, action) => {
    return {
      boundToDestroy: {
        test: () =>
          new Promise(async (resolve) => {
            if (req.params.force) return resolve(true);

            const related = await Assignments.getRelated(assignment);
            const bound = _.pickBy(related, (v) => v.length);
            if (Object.keys(bound).length)
              return resolve({
                success: false,
                reason: { dependentRecords: bound },
              });

            resolve({ success: true });
          }),
        warning:
          "follwing documents refer to this record and will be destroyed upon force delete call",
      },
      accessRights: {
        test: () =>
          new Promise(async (resolve) => {
            const authenticated = _.get(req, "session.authenticated");
            const { profileType, institutionId } = authenticated;

            const instIdMatch = institutionId === assignment.institutionId;
            const isIdesAdmin = profileType === Constants.idesAdmin;
            const isSchoolAdmin =
              profileType === Constants.schoolAdmin && instIdMatch;

            // if (isIdesAdmin) return resolve(true)

            // if (action === 'create') {
            //     if (isSchoolAdmin) return resolve(true)
            // }

            // if (action === 'list') {
            //     if (instIdMatch) return resolve(true)
            // }

            // if (action === 'update') {
            //     if (isSchoolAdmin) return resolve(true)
            // }

            // if (action === 'delete') {
            //     if (isSchoolAdmin) return resolve(true)
            // }

            resolve(true);
          }),
        warning: "you have no access to requested resource",
      },
      belongsToGroup: {
        test: () =>
          new Promise(async (resolve) => {
            if (
              assignment["belongsToGroup"] &&
              (await Groups.findOne({ groupId: assignment.belongsToGroup }))
            )
              return resolve(true);
            resolve(false);
          }),
        warning:
          "belongsToGroup is required prop and refers to exisiting group",
      },
      belongsToInstructor: {
        test: () =>
          new Promise(async (resolve) => {
            if (
              assignment["belongsToInstructor"] &&
              (await Accounts.findOne({
                accountId: assignment.belongsToInstructor,
              }))
            )
              return resolve(true);
            resolve(false);
          }),
        warning:
          "belongsToInstructor is required prop and refers to exisiting instructor",
      },
      belongsToDiscipline: {
        test: () =>
          new Promise(async (resolve) => {
            if (
              assignment["belongsToDiscipline"] &&
              (await Disciplines.findOne({
                disciplineId: assignment.belongsToDiscipline,
              }))
            )
              return resolve(true);
            resolve(false);
          }),
        warning:
          "belongsToDiscipline is required prop and refers to exisiting discipline",
      },
      topic: {
        test: () =>
          new Promise(async (resolve) => {
            if (assignment["topic"] && assignment["topic"].length)
              return resolve(true);
            resolve(false);
          }),
        warning: "topic is required prop",
      },
      format: {
        test: () =>
          new Promise(async (resolve) => {
            if (
              assignment["format"] &&
              assignment["format"].length &&
              [Constants.test, Constants.file, Constants.text].includes(
                assignment.format
              )
            )
              return resolve(true);
            resolve(false);
          }),
        warning:
          "format is required prop and should be submitted as: test || file || text",
      },
      content: {
        test: () =>
          new Promise(async (resolve) => {
            if (assignment["content"] && _.isPlainObject(assignment["content"]))
              return resolve(true);
            resolve(false);
          }),
        warning:
          "content is required prop and should be submitted as plain object",
      },
      materials: {
        test: () =>
          new Promise(async (resolve) => {
            if (
              assignment["materials"] &&
              !Array.isArray(assignment["materials"])
            )
              return resolve(false);
            resolve(true);
          }),
        warning:
          "content is required prop and should be submitted as array object",
      },
      startDate: {
        test: () =>
          new Promise(async (resolve) => {
            if (assignment["startDate"] && assignment["startDate"].length)
              return resolve(true);
            resolve(false);
          }),
        warning: "startDate is required prop",
      },
      endDate: {
        test: () =>
          new Promise(async (resolve) => {
            if (assignment["endDate"] && assignment["endDate"].length)
              return resolve(true);
            resolve(false);
          }),
        warning: "endDate is required prop",
      },
      institutionId: {
        test: () =>
          new Promise(async (resolve) => {
            if (
              assignment["institutionId"] &&
              (await Institutions.findOne({
                institutionId: assignment.institutionId,
              }))
            )
              return resolve(true);
            resolve(false);
          }),
        warning:
          "institutionId is required prop and should match registered organization",
      },
    };
  },
};
