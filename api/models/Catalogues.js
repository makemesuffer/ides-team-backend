const shortid = require("shortid");
const _ = require("lodash");
const { Constants } = sails.config.globals;

module.exports = {
  attributes: {
    catalogueName: {
      type: "string",
    },
    belongsToAccount: {
      type: "string",
      required: false,
    },
    fileUrl: {
      type: "string",
    },
    belongsToFaculty: {
      type: "string",
    },
    belongsToCourse: {
      type: "string",
    },
    belongsToDepartment: {
      type: "string",
    },
    belongsToGroup: {
      type: "string",
    },
    belongsToTeacher: {
      type: "string",
    },
    belongsToDiscipline: {
      type: "string",
    },
    belongsToDisciplineTopic: {
      type: "string",
    },
    topicType: {
      type: "string",
    },
    type: {
      type: "string",
      defaultsTo: "folder",
    },
    isMy: {
      type: "boolean",
      defaultsTo: false,
    },
    size: {
      type: "string",
      defaultsTo: "",
    },
    // meta
    institutionId: {
      type: "string",
      required: false,
    },
    catalogueId: {
      type: "string",
    },
    belongsToCatalogueId: {
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

  beforeCreate: async (catalogue, next) => {
    try {
      catalogue.catalogueId = shortid.generate();

      catalogue.utc = Utils.date.utc();
      catalogue.ymd = Utils.date.ymd();

      next();
    } catch (e) {
      next(e);
    }
  },

  beforeUpdate: async (valuesToUpdate, next) => {
    try {
      const original = await Catalogues.findOne({
        catalogueId: valuesToUpdate.catalogueId,
      });
      valuesToUpdate = Catalogues.secureItemsRefs(valuesToUpdate);

      const contentItemsToBeUpdated = _.xorWith(
        valuesToUpdate.content,
        original.content,
        _.isEqual
      );

      if (contentItemsToBeUpdated.length) {
        const reqs = [];

        const newItemsRefs = Catalogues.getItemsRefs(valuesToUpdate);
        const currentItemsRefs = Catalogues.getItemsRefs(original);

        const updatedItems = currentItemsRefs.filter((r) =>
          newItemsRefs.includes(r)
        );
        const removedItems = currentItemsRefs.filter(
          (r) => !newItemsRefs.includes(r)
        );

        updatedItems.forEach((ref) =>
          reqs.push(
            new Promise(async (resolve, reject) => {
              const {
                success,
                reason: relatedAssignments,
              } = await Assignments.fetch({
                filter: { materials: { $elemMatch: { catalogueItemId: ref } } },
              });
              if (!success) return reject(reason);

              await Promise.all(
                relatedAssignments.map(
                  (assignment) =>
                    Assignments.update(
                      { assignmentId: assignment.assignmentId },
                      {
                        materials: [
                          ...assignment.materials.filter(
                            ({ catalogueItemId }) => catalogueItemId !== ref
                          ),
                          ...valuesToUpdate.content.filter(
                            ({ catalogueItemId }) => catalogueItemId === ref
                          ),
                        ],
                      }
                    ).catch((e) => reject(e)) || []
                )
              );

              resolve();
            })
          )
        );

        removedItems.forEach((ref) =>
          reqs.push(
            new Promise(async (resolve, reject) => {
              const {
                success,
                reason: relatedAssignments,
              } = await Assignments.fetch({
                filter: { materials: { $elemMatch: { catalogueItemId: ref } } },
              });
              if (!success) return reject(reason);

              await Promise.all(
                relatedAssignments.map(
                  (assignment) =>
                    Assignments.update(
                      { assignmentId: assignment.assignmentId },
                      {
                        materials: assignment.materials.filter(
                          ({ catalogueItemId }) => catalogueItemId !== ref
                        ),
                      }
                    ).catch((e) => reject(e)) || []
                )
              );

              resolve();
            })
          )
        );

        await Promise.all(reqs);
      }

      next();
    } catch (e) {
      next(e);
    }
  },

  // repository

  getItemsRefs: (catalogue) => {
    const { content = [] } = catalogue;
    const refs = Utils.object
      .findDeep(content, "catalogueItemId")
      .map(({ catalogueItemId }) => catalogueItemId);

    return refs;
  },

  secureItemsRefs: (catalogue) => {
    const { content = [] } = catalogue;
    const flat = Utils.object.flattenObject(content);

    const pathsWithFolders = Object.keys(flat)
      .filter((k) => k.includes("contains"))
      .map((k) => k.slice(0, k.lastIndexOf("contains") - 1));
    const pathsWithItems = Object.keys(flat)
      .filter((k) => k.includes("url"))
      .map((k) => k.slice(0, k.lastIndexOf("url") - 1));
    const tots = _.uniq([...pathsWithItems, ...pathsWithFolders]).map((p) =>
      Utils.object.dotsToBrackets(p)
    );

    tots.forEach((path) => {
      if (_.get(content, `${path}.catalogueItemId`)) return;
      _.set(content, `${path}.catalogueItemId`, shortid.generate());
    });

    return { ...catalogue, content };
  },

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
      let records = await NativeQuery.find(Catalogues, params.where, {
        ...params,
      });

      if (query.populate)
        records = await Promise.all(records.map((r) => Catalogues.populate(r)));
      return { success: true, reason: records };
    } catch (e) {
      return { success: false, reason: e };
    }
  },

  fillIn: async (filter, props) => {
    try {
      if (props.populated) throw new Error("doNotFillInPopulated");

      const records = await NativeQuery.find(Catalogues, filter);
      if (!records.length) return { success: false, reason: "noRecordsFound" };
      const updateReqs = [];

      records.forEach((r) =>
        updateReqs.push(
          new Promise(async (resolve, reject) => {
            Object.keys(props).forEach((path) => _.set(r, path, props[path]));

            const updated =
              (await Catalogues.update(
                { catalogueId: r.catalogueId },
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

      // belongsToAccount ref
      reqs.push(
        new Promise(async (resolve) => {
          const account =
            (await Accounts.findOne({ accountId: record.belongsToAccount })) ||
            null;
          populated.account = account;
          resolve({ account });
        })
      );

      await Promise.all(reqs);
      return { ...populated };
    } catch (e) {
      return { success: false, reason: e };
    }
  },

  getRelated: async (record) => {
    const criteria = { catalogueId: record.catalogueId };

    const related = {};

    return related;
  },

  // validation

  validateCreate: async (req, catalogue) => {
    try {
      const checkRules = _.omit(
        Catalogues.commonRules(req, catalogue, "create"),
        ["boundToDestroy", "affectedAssignments"]
      );
      const failedChecks = {};
      const checks = [];

      for (const prop in {
        ...checkRules,
        ...catalogue,
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
      const records = await NativeQuery.find(Catalogues, filter);
      if (!records.length) return { success: false, reason: "noRecordsFound" };

      const allValidations = [];
      records.forEach((r) =>
        allValidations.push(
          new Promise(async (resolve) => {
            r = Catalogues.secureItemsRefs(r);

            const checkRules = _.omit(
              Catalogues.commonRules(req, { ...r, ...props }, "update"),
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
              return resolve({ failedChecks, catalogueId: r.catalogueId });
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

  validateDestroy: async (req, catalogueId) => {
    try {
      const catalogue = await Catalogues.findOne({ catalogueId });
      if (!catalogue) return { success: false, reason: "noRecordsFound" };

      const checkRules = _.pick(
        { ...Catalogues.commonRules(req, catalogue, "delete") },
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
      const records = await NativeQuery.find(Catalogues, query.filter);

      const allValidations = [];
      records.forEach((r) =>
        allValidations.push(
          new Promise(async (resolve) => {
            const checkRules = _.pick(
              { ...Catalogues.commonRules(req, r, "list") },
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
              return resolve({ failedChecks, catalogueId: r.catalogueId });
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

  commonRules: (req, catalogue, action) => {
    return {
      affectedAssignments: {
        test: () =>
          new Promise(async (resolve) => {
            const original = await Catalogues.findOne({
              catalogueId: catalogue.catalogueId,
            });
            const contentItemsToBeUpdated = _.xorWith(
              catalogue.content,
              original.content,
              _.isEqual
            );

            const newItemsRefs = Catalogues.getItemsRefs(catalogue);
            const currentItemsRefs = Catalogues.getItemsRefs(original);

            const updatedItems = currentItemsRefs.filter((r) =>
              newItemsRefs.includes(r)
            );
            const removedItems = currentItemsRefs.filter(
              (r) => !newItemsRefs.includes(r)
            );
            const tots = [...removedItems, ...updatedItems];

            if (req.params.force) {
              const reqs = [];
              const unenforceable = {};

              updatedItems.forEach((ref) =>
                reqs.push(
                  new Promise(async (resolve, reject) => {
                    const {
                      success,
                      reason: relatedAssignments,
                    } = await Assignments.fetch({
                      filter: {
                        materials: { $elemMatch: { catalogueItemId: ref } },
                      },
                    });
                    if (!success) return reject(reason);

                    await Promise.all(
                      relatedAssignments.map(async (assignment) => {
                        const {
                          success: valid,
                          reason: checks,
                        } = await Assignments.validateUpdate(
                          req,
                          { assignmentId: assignment.assignmentId },
                          {
                            materials: [
                              ...assignment.materials.filter(
                                ({ catalogueItemId }) => catalogueItemId !== ref
                              ),
                              ...catalogue.content.filter(
                                ({ catalogueItemId }) => catalogueItemId === ref
                              ),
                            ],
                          }
                        );

                        if (!valid)
                          _.set(
                            unenforceable,
                            `invalidAssignmentUpdates.${assignment.assignmentId}`,
                            checks
                          );
                      })
                    );

                    resolve();
                  })
                )
              );

              removedItems.forEach((ref) =>
                reqs.push(
                  new Promise(async (resolve, reject) => {
                    const {
                      success,
                      reason: relatedAssignments,
                    } = await Assignments.fetch({
                      filter: {
                        materials: { $elemMatch: { catalogueItemId: ref } },
                      },
                    });
                    if (!success) return reject(reason);

                    await Promise.all(
                      relatedAssignments.map(async (assignment) => {
                        const {
                          success: valid,
                          reason: checks,
                        } = await Assignments.validateUpdate(
                          req,
                          { assignmentId: assignment.assignmentId },
                          {
                            materials: assignment.materials.filter(
                              ({ catalogueItemId }) => catalogueItemId !== ref
                            ),
                          }
                        );

                        if (!valid)
                          _.set(
                            unenforceable,
                            `invalidAssignmentUpdates.${assignment.assignmentId}`,
                            checks
                          );
                      })
                    );

                    resolve();
                  })
                )
              );

              await Promise.all(reqs);
              if (
                Object.keys(
                  _.get(unenforceable, "invalidAssignmentUpdates", [])
                ).length
              )
                return resolve({ success: false, reason: { unenforceable } });

              return resolve(true);
            }

            if (contentItemsToBeUpdated.length) {
              const reqs = [];
              const affected = {};

              tots.forEach((ref) =>
                reqs.push(
                  new Promise(async (resolve, reject) => {
                    const {
                      reason: relatedAssignments,
                      success,
                    } = await Assignments.fetch({
                      filter: {
                        materials: { $elemMatch: { catalogueItemId: ref } },
                      },
                    });

                    if (!success) return reject(reason);
                    if (relatedAssignments.length)
                      affected.willBeUpdated = [
                        ...relatedAssignments,
                        ..._.get(affected, "willBeUpdated", []),
                      ];
                    resolve();
                  })
                )
              );

              await Promise.all(reqs);
              if (Object.keys(affected).length)
                return resolve({ success: false, reason: { ...affected } });
            }

            resolve({ success: true });
          }),
        warning: "following records will be modified upon this call",
      },
      boundToDestroy: {
        test: () =>
          new Promise(async (resolve) => {
            if (req.params.force) return resolve(true);

            const related = await Catalogues.getRelated(catalogue);
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

            const instIdMatch = institutionId === catalogue.institutionId;
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
      content: {
        test: () =>
          new Promise(async (resolve) => {
            if (catalogue.content && !Array.isArray(catalogue.content))
              return resolve(false);
            resolve(true);
          }),
        warning: "content should be submitted as [contentItemType,]",
      },
    };
  },
};
