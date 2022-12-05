const shortid = require("shortid");
const _ = require("lodash");
const permissions = require("../../config/accountPermissions");
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
    password: {
      type: "string",
      required: true,
    },
    email: {
      type: "string",
      required: true,
    },
    phoneNumber: {
      type: "string",
      required: true,
    },
    dateOfBirth: {
      type: "string",
    },
    region: {
      type: "string",
      required: true,
      enum: [Constants.ru],
    },
    avatarUrl: {
      type: "string",
      defaultsTo: "defaultAvatarUrl",
    },
    // name
    firstName: {
      type: "string",
      required: true,
    },
    lastName: {
      type: "string",
      required: true,
    },
    fullName: {
      type: "string",
    },
    patronymic: {
      type: "string",
    },
    nameWithPatronymic: {
      type: "string",
    },
    fullNameWithPatronymic: {
      type: "string",
    },
    //
    preferences: {
      type: "json",
      defaultsTo: {},
    },
    permissions: {
      type: "json",
      defaultsTo: {},
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
    accountId: {
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

  beforeCreate: async (account, next) => {
    try {
      account.accountId = shortid.generate();

      account.utc = Utils.date.utc();
      account.ymd = Utils.date.ymd();

      account.firstName = Utils.string.cap(account.firstName);
      account.lastName = Utils.string.cap(account.lastName);
      account.fullName = `${account.firstName} ${account.lastName}`;

      if (account.patronymic) {
        account.patronymic = Utils.string.cap(account.patronymic);
        account.nameWithPatronymic = `${account.firstName} ${account.patronymic}`;
        account.fullNameWithPatronymic = `${account.firstName} ${account.patronymic} ${account.lastName}`;
      }

      // await Catalogues.create({ institutionId: account.institutionId, belongsToAccount: account.accountId })

      // set permissions
      account.permissions = permissions[account.profileType];
      next();
    } catch (e) {
      next(e);
    }
  },

  afterCreate: async (account, next) => {
    try {
      const invite = Invites.findOne({ email: account.email });
      if (invite) await Invites.destroy({ email: account.email });

      // notifiy applicant via email
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
      let records = await NativeQuery.find(Accounts, params.where, {
        ...params,
      });

      if (query.populate)
        records = await Promise.all(records.map((r) => Accounts.populate(r)));
      return { success: true, reason: records };
    } catch (e) {
      return { success: false, reason: e };
    }
  },

  fillIn: async (filter, props) => {
    try {
      if (props.populated) throw new Error("doNotFillInPopulated");

      const records = await NativeQuery.find(Accounts, filter);
      if (!records.length) return { success: false, reason: "noRecordsFound" };
      const updateReqs = [];

      records.forEach((r) =>
        updateReqs.push(
          new Promise(async (resolve, reject) => {
            Object.keys(props).forEach((path) => _.set(r, path, props[path]));

            const updated =
              (await Accounts.update(
                { accountId: r.accountId },
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

      if (record.profileType === Constants.student) {
        // additionalInfo.facultyId ref
        if (_.get(record, "additionalInfo.facultyId"))
          reqs.push(
            new Promise(async (resolve) => {
              const faculty =
                (await Faculties.findOne({
                  facultyId: record.additionalInfo.facultyId,
                })) || null;
              populated.additionalInfo.faculty = faculty;
              resolve({ faculty });
            })
          );

        // additionalInfo.departmentId ref
        if (_.get(record, "additionalInfo.departmentId"))
          reqs.push(
            new Promise(async (resolve) => {
              const department =
                (await Departments.findOne({
                  departmentId: record.additionalInfo.departmentId,
                })) || null;
              populated.additionalInfo.department = department;
              resolve({ department });
            })
          );

        // additionalInfo.groupId ref
        if (_.get(record, "additionalInfo.groupId"))
          reqs.push(
            new Promise(async (resolve) => {
              const group =
                (await Groups.findOne({
                  groupId: record.additionalInfo.groupId,
                })) || null;
              populated.additionalInfo.group = group;
              resolve({ group });
            })
          );
      }

      if (record.profileType === Constants.staff) {
        // additionalInfo.facultyId ref
        if (_.get(record, "additionalInfo.facultyId"))
          reqs.push(
            new Promise(async (resolve) => {
              const faculty =
                (await Faculties.findOne({
                  facultyId: record.additionalInfo.facultyId,
                })) || null;
              populated.additionalInfo.faculty = faculty;
              resolve({ faculty });
            })
          );

        // additionalInfo.departmentId ref
        if (_.get(record, "additionalInfo.departmentId"))
          reqs.push(
            new Promise(async (resolve) => {
              const department =
                (await Departments.findOne({
                  departmentId: record.additionalInfo.departmentId,
                })) || null;
              populated.additionalInfo.department = department;
              resolve({ department });
            })
          );

        // additionalInfo.instructs ref
        if (_.get(record, "additionalInfo.instructs"))
          _.get(record, "additionalInfo.instructs").forEach((disciplineId) => {
            reqs.push(
              new Promise(async (resolve) => {
                const discipline =
                  (await Disciplines.findOne({ disciplineId })) || null;
                _.set(
                  populated,
                  `additionalInfo.disciplines.${disciplineId}`,
                  discipline
                );
                resolve({ discipline });
              })
            );
          });
      }

      if (record.profileType === Constants.parent) {
      }

      await Promise.all(reqs);
      return { ...populated };
    } catch (e) {
      return { success: false, reason: e };
    }
  },

  getRelated: async (record) => {
    const criteria = { belongsToAccount: record.accountId };

    const related = {
      catalogues: await Catalogues.find(criteria),
      assignments: await Assignments.find({
        belongsToInstructor: record.accountId,
      }),
      events: await Events.find({ instructor: record.accountId }),
      disciplines: await Promise.all(
        _.get(record, "additionalInfo.instructs", []).map((dId) =>
          Disciplines.findOne({ disciplineId: dId })
        )
      ),
    };

    return related;
  },

  // service

  checkInWithPassword: async (email, pass) => {
    try {
      const acc = await Accounts.findOne({ email });
      if (!acc) return { success: false, reason: "noAccountWithSuchEmail" };

      if (acc.password === pass || Secret.decrypt(acc.password) === pass) {
        const org = await Institutions.findOne({
          institutionId: acc.institutionId,
        });
        const auth = { ..._.omit(acc, ["password"]), institution: org };
        return { success: true, reason: auth };
      }

      return { success: false, reason: "wrongPassword" };
    } catch (e) {
      return { success: false, reason: e };
    }
  },

  loginByPhone: async (phone, pass) => {
    try {
      const acc = await Accounts.findOne({ phoneNumber: phone });
      if (!acc) return { success: false, reason: "noAccountWithSuchPhone" };

      if (acc.password === pass || Secret.decrypt(acc.password) === pass) {
        const org = await Institutions.findOne({
          institutionId: acc.institutionId,
        });
        const auth = { ..._.omit(acc, ["password"]), institution: org };
        return { success: true, reason: auth };
      }

      return { success: false, reason: "wrongPassword" };
    } catch (e) {
      return { success: false, reason: e };
    }
  },

  close: async (accountId) => {
    try {
      const acc = await Accounts.findOne({ accountId });
      if (!acc) return { success: false, reason: "noAccountWithSuchId" };

      await Accounts.update(
        { accountId },
        {
          additionalInfo: { ...acc.additionalInfo, closed: true },
        }
      );

      return { success: true, reason: "accountClosed" };
    } catch (e) {
      return { success: false, reason: e };
    }
  },

  requestPasswordResetLink: async (email, newPassword, locale = {}) => {
    try {
      const acc = await Accounts.findOne({ email });
      if (!acc) return { success: false, reason: "noAccountWithSuchEmail" };

      const hash = { email, newPassword, generatedAt: new Date().getTime() };
      const resetHash = Secret.encrypt(JSON.stringify(hash));

      const resetLinkAndText = `\n\n ${locale.clickLinkBelowToConfirmPasswordChange}  \n\n ${sails.config.appAddress}/passwordReset/${resetHash}`;

      // await Mail.send(email, 'IDES 24 Password Reset', resetLinkAndText)

      return { success: true };
    } catch (e) {
      return { success: false, reason: e };
    }
  },

  sendNewPassword: async (email) => {
    try {
      console.log(email);
      const acc = await Accounts.findOne({ email });

      if (acc) {
      }
      const password = shortid.generate();
      return { success: false, reason: "noAccountWithSuchEmail" };
      //await Mail.send(email, "IDES 24 Password Reset", password);
    } catch (e) {
      return { success: false, reason: e };
    }
  },

  resetPasswordWithHash: async (resetHash) => {
    try {
      const hash = JSON.parse(Secret.decrypt(resetHash));
      const { email, newPassword, generatedAt } = hash;

      // check 5 minutes expiration
      if (new Date().getTime() - Number(generatedAt) > 300000) {
        return { success: false, reason: "expiredLink" };
      }
      const hashedNewPassword = Secret.encrypt(newPassword);
      await Accounts.update({ email }, { password: hashedNewPassword });

      return { success: true };
    } catch (e) {
      return { success: false, reason: e };
    }
  },

  broadcastSystemUpdate: (to, data) => {
    let rooms = [];
    if (Array.isArray(to)) rooms = [...to];
    else rooms[to];

    Sockets.broadcast(
      [...rooms.map((to) => Sockets.makeRoomName(Constants.systemUpdates, to))],
      "systemUpdate",
      data
    );
  },

  // validation

  validateCreate: async (req, account) => {
    try {
      const checkRules = _.omit(Accounts.commonRules(req, account, "create"), [
        "boundToDestroy",
      ]);
      const failedChecks = {};
      const checks = [];

      for (const prop in {
        ...checkRules,
        ...account,
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
      const records = await NativeQuery.find(Accounts, filter);
      if (!records.length) return { success: false, reason: "noRecordsFound" };

      const allValidations = [];
      records.forEach((r) =>
        allValidations.push(
          new Promise(async (resolve) => {
            const checkRules = _.omit(
              Accounts.commonRules(req, { ...r, ...props }, "update"),
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
              return resolve({ failedChecks, accountId: r.accountId });
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

  validateDestroy: async (req, accountId) => {
    try {
      const account = await Accounts.findOne({ accountId });
      if (!account) return { success: false, reason: "noRecordsFound" };

      const checkRules = _.pick(
        { ...Accounts.commonRules(req, account, "delete") },
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
      const records = await NativeQuery.find(Accounts, query.filter);

      const allValidations = [];
      records.forEach((r) =>
        allValidations.push(
          new Promise(async (resolve) => {
            const checkRules = _.pick(
              { ...Accounts.commonRules(req, r, "list") },
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
              return resolve({ failedChecks, accountId: r.accountId });
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

  commonRules: (req, account, action) => {
    return {
      boundToDestroy: {
        test: () =>
          new Promise(async (resolve) => {
            if (req.params.force) return resolve(true);

            const related = await Accounts.getRelated(account);
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

            const instIdMatch = institutionId === account.institutionId;
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
      profileType: {
        test: () =>
          new Promise(async (resolve) => {
            if (
              account["profileType"] &&
              account["profileType"].length &&
              [
                Constants.student,
                Constants.parent,
                Constants.staff,
                Constants.schoolAdmin,
                Constants.idesAdmin,
              ].includes(account.profileType)
            )
              return resolve(true);
            resolve(false);
          }),
        warning:
          "profileType is required prop and should be submitted as: student || parent || staff || schoolAdmin || idesAdmin",
      },
      password: {
        test: () =>
          new Promise(async (resolve) => {
            if (account["password"] && account["password"].length)
              return resolve(true);
            resolve(false);
          }),
        warning: "password is required prop",
      },
      email: {
        test: () =>
          new Promise(async (resolve) => {
            if (account["email"] && account["email"].length)
              return resolve(true);
            resolve(false);
          }),
        warning: "email is required prop",
      },
      region: {
        test: () =>
          new Promise(async (resolve) => {
            if (
              account["region"] &&
              account["region"].length &&
              [Constants.ru].includes(account.region)
            )
              return resolve(true);
            resolve(false);
          }),
        warning: "region is required prop and shuould be submitted as ru",
      },
      firstName: {
        test: () =>
          new Promise(async (resolve) => {
            if (account["firstName"] && account["firstName"].length)
              return resolve(true);
            resolve(false);
          }),
        warning: "firstName is required prop",
      },
      lastName: {
        test: () =>
          new Promise(async (resolve) => {
            if (account["lastName"] && account["lastName"].length)
              return resolve(true);
            resolve(false);
          }),
        warning: "lastName is required prop",
      },
      institutionId: {
        test: () =>
          new Promise(async (resolve) => {
            if (
              account["institutionId"] &&
              (await Institutions.findOne({
                institutionId: account.institutionId,
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
