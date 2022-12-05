module.exports = {
  listAccountsById: async (req, res) => {
    try {
      const { accountId } = req.body;
      const arrayOfIds = [];
      const arrayOfAccounts = [];

      const account = await Accounts.findOne({ accountId: accountId });
      if (account.profileType == "student") {
        const events = await Events.find({
          belongsToGroup: account.additionalInfo.groupId,
        });
        for (let event of events) {
          arrayOfIds.push(event.instructor);
        }
        const uniqueArray = arrayOfIds.filter((v, i, a) => a.indexOf(v) === i);
        for (let unique of uniqueArray) {
          const teachers = await Accounts.find({
            accountId: unique,
          });
          arrayOfAccounts.push(...teachers);
        }
        for (let arrayOfAccount of arrayOfAccounts) {
          delete arrayOfAccount.password;
        }
        return res.ok(true, arrayOfAccounts);
      }
      if (account.profileType == "staff") {
        const events = await Events.find({ instructor: account.accountId });
        for (let event of events) {
          arrayOfIds.push(event.belongsToGroup);
        }
        const uniqueArray = arrayOfIds.filter((v, i, a) => a.indexOf(v) === i);
        for (let unique of uniqueArray) {
          const students = await Accounts.find({
            "additionalInfo.groupId": unique,
          });

          arrayOfAccounts.push(...students);
        }
        for (let arrayOfAccount of arrayOfAccounts) {
          delete arrayOfAccount.password;
        }
        return res.ok(true, arrayOfAccounts);
      }
      if (account.profileType == "idesAdmin") {
        const accounts = await Accounts.find({
          accountId: { $not: accountId },
        });

        return res.ok(true, accounts);
      }
      if (account.profileType == "parent") {
        const accounts = await Accounts.find({
          accountId: { $not: accountId },
        });

        return res.ok(true, accounts);
      }
    } catch (e) {
      return res.error(e);
    }
  },
  listDisciplines: async (req, res) => {
    try {
      const { departmentId } = req.body;
      const arrayOfIds = [];
      const arrayOfInstructs = [];

      const accounts = await Accounts.find({
        "additionalInfo.departmentId": departmentId,
        profileType: "staff",
      });

      for (let account of accounts) {
        console.log(account);
        for (let instruct of account.additionalInfo.instructs) {
          arrayOfIds.push(instruct);
        }
      }
      const uniqueArray = arrayOfIds.filter((v, i, a) => a.indexOf(v) === i);
      for (let uniqueId of uniqueArray) {
        const instruct = await Disciplines.find({ disciplineId: uniqueId });
        arrayOfInstructs.push(...instruct);
      }
      return res.ok(true, arrayOfInstructs);
    } catch (e) {
      return res.error(e);
    }
  },

  listGeneral: async (req, res) => {
    try {
      let countOfInstructs = 0;
      const { accountId } = req.body;
      const disciplines = [];
      const arrayOfInstructs = [];
      const arr = [];
      const a = [];
      const account = await Accounts.findOne({ accountId: accountId });
      const events = await Events.find({
        belongsToGroup: account.additionalInfo.groupId,
      });
      const assignments = await Assignments.find({
        belongsToGroup: account.additionalInfo.groupId,
      });
      for (let event of events) {
        disciplines.push(event.belongsToDiscipline);
      }
      const uniqueArray = disciplines.filter((v, i, a) => a.indexOf(v) === i);
      for (let uniqueId of uniqueArray) {
        const instruct = await Disciplines.find({ disciplineId: uniqueId });

        arrayOfInstructs.push(...instruct);
      }
      for (let k of arrayOfInstructs) {
        countOfInstructs += k.topics.length;

        // for (let s of k.topics) {
        //   const events = await Events.find({
        //     "topic.name": s.name,
        //     "topic.type": s.type,
        //     belongsToDiscipline: k.disciplineId,
        //   });

        //   arr.push(...events);

        //   // if (
        //   //   (s = {
        //   //     name: "Лекция №1",
        //   //     type: "lecture",
        //   //   })
        //   // ) {
        //   //   console.log(k);
        //   // }
        // }
      }
      // for (let ar of arr) {
      //   const date = {
      //     name: ar.topic.name,
      //     type: ar.topic.type,
      //   };
      //   a.push(date);
      // }
      for (let g of assignments) {
        let s = g.submissions + "." + accountId;
        console.log(s);
        if (g.submissions + accountId) {
          console.log(g.submissions);
        }
      }
      return res.ok(true, { grade: 5, countOfInstructs, arrayOfInstructs });
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

  listDisciplinesByPlanId: async (req, res) => {
    try {
      const { planId } = req.params;
      const disciplines = await Plans.findOne({
        planId: planId,
      });

      return res.ok(true, disciplines);
    } catch (e) {
      return res.error(e);
    }
  },
  getGeneralById: async (req, res) => {
    const { authenticated } = req.session;
    const { catalogueId } = req.params;
    let aa = [];
    //S1EeW3zOF
    try {
      const result = await Catalogues.find({}).where({
        belongsToCatalogueId: catalogueId,
      });
      for (let res of result) {
        if (
          res.catalogueName != "Кафедры" &&
          res.catalogueName != "Курсы" &&
          res.belongsToTeacher == null &&
          res.type == "file"
        ) {
          console.log("h");
          const r = await Catalogues.findOne({}).where({
            belongsToDepartment: "BJ-D0czuY", //authenticated.additionalInfo.belongsToDepartment
            belongsToTeacher: null,
            belongsToCatalogueId: catalogueId,
          });
          console.log();
          if (r) {
            aa.push(r);
          }

          aa.push(res);
        } else if (
          res.belongsToDepartment != null &&
          res.belongsToFaculty != null &&
          res.belongsToTeacher == "S1EeW3zOF"
        ) {
          const result = await Catalogues.find({}).where({
            belongsToCatalogueId: catalogueId,
            belongsToTeacher: null,
          });

          aa.push(res);
          //aa.push(...result);
        }
      }
      return res.send({ success: true, reason: [{ content: aa }] });
    } catch (e) {
      return res.error(e);
    }

    if (authenticated.profileType === "student") {
      try {
        const result = await Catalogues.find({}).where({
          belongsToCatalogueId: catalogueId,
        });

        return res.send({ success: true, reason: [{ content: result }] });
      } catch (e) {
        return res.error(e);
      }
    }
  },
};
