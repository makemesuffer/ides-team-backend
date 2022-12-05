module.exports = {
  create: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { plan } = req.body;

      if (plan) {
        const { success: valid, reason: checks } = await Plans.validateCreate(
          req,
          plan
        );
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const record = await Plans.create(plan);
        return res.created({ planId: record.planId });
      }

      return res.badRequest({
        missingProps: "plan",
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },

  list: async (req, res) => {
    try {
      const locale = Locale("markers");

      const query = JSON.parse(req.params.query || '{"filter":{}}');
      const { success: valid, reason: checks } = await Plans.validateList(
        req,
        query
      );
      if (!valid)
        return res.badRequest({
          details: checks,
          marker: locale.requestValidationFailed,
        });

      const { success, reason } = await Plans.fetch(query);
      if (!success) return res.badRequest(reason);

      return res.ok(true, reason);
    } catch (e) {
      return res.error(e);
    }
  },

  listByFacultyAndDepartment: async (req, res) => {
    try {
      const { facultyId, departmentId } = req.params;
      const plans = await Plans.find({
        belongsToFaculty: facultyId,
        belongsToDepartment: departmentId,
      });

      return res.ok(true, plans);
    } catch (e) {
      return res.error(e);
    }
  },

  listAccountsById: async (req, res) => {
    const { authenticated } = req.session;
    try {
      const { accountId } = req.body;
      const account = await Accounts.findOne({ accountId: accountId });
      if (account.profileType == "student") {
        let arr = [];
        let disciplines = [];
        let students = [];
        const plan = await Plans.findOne({
          belongsToFaculty: account.additionalInfo.facultyId,
          belongsToDepartment: account.additionalInfo.departmentId,
          belongsToCourse: account.additionalInfo.courseId,
        });
        const teachers = await Accounts.find({ profileType: "staff" });
        for (let discipline of plan.disciplines) {
          disciplines.push(discipline);
          console.log(discipline);
        }
        for (let teacher of teachers) {
          for (let instruct of teacher.additionalInfo.instructs) {
            for (let a of disciplines) {
              if (a == instruct) {
                arr.push(teacher);
              }
            }
          }
        }
        for (let s of arr) {
          const date = {
            firstName: s.firstName,
            lastName: s.lastName,
            patronymic: s.patronymic,
            accountId: s.accountId,
          };
          students.push(date);
        }
        return res.ok(true, students);
      }
      if (account.profileType == "staff") {
        let arr = [];
        let disciplines = [];
        let arrayStudents = [];
        let students = [];
        const teacher = await Accounts.findOne({
          accountId: account.accountId,
        });
        for (let instruct of teacher.additionalInfo.instructs) {
          disciplines.push(instruct);
        }
        const plans = await Plans.find({
          belongsToFaculty: account.additionalInfo.facultyId,
          belongsToDepartment: account.additionalInfo.departmentId,
        });
        for (let plan of plans) {
          for (let a of plan.disciplines) {
            for (let k of disciplines) {
              if (k == a) {
                arr.push(plan);
              }
            }
          }
        }
        for (let ar of arr) {
          const groups = await Groups.find({
            belongsToFaculty: ar.belongsToFaculty,
            belongsToDepartment: ar.belongsToDepartment,
            belongsToCourse: ar.belongsToCourse,
          });
          for (let group of groups) {
            console.log(group);
            const accs = await Accounts.find();
            for (let acc of accs) {
              if (acc.additionalInfo.groupId == group.groupId) {
                arrayStudents.push(acc);
              }
            }
          }
        }

        for (let arrayStudent of arrayStudents) {
          const date = {
            firstName: arrayStudent.firstName,
            lastName: arrayStudent.lastName,
            patronymic: arrayStudent.patronymic,
            accountId: arrayStudent.accountId,
          };
          students.push(date);
        }
        return res.ok(true, students);
      }
      return res.ok(true);
    } catch (e) {
      return res.error(e);
    }
  },

  update: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { filter, props } = req.body;

      const updateProps = ["filter", "props"];
      const missingProps = updateProps.filter((item) => !(item in req.body));

      if (!missingProps.length) {
        const { success: valid, reason: checks } = await Plans.validateUpdate(
          req,
          filter,
          props
        );
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const { success, reason } = await Plans.fillIn(filter, props);
        if (!success) return res.badRequest(reason);
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

  delete: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { planId } = req.params;

      if (planId) {
        const { success: valid, reason: checks } = await Plans.validateDestroy(
          req,
          planId
        );
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const result = await Plans.destroy({ planId });
        if (!result.length)
          return res.badRequest({ marker: locale.noRecordsFound });

        return res.ok(true, { marker: locale.resourceHasBeenRemoved });
      }

      return res.badRequest({
        missingProps: ["planId"],
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },
};
