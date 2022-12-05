module.exports = {
  create: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { account } = req.body;

      if (account) {
        const {
          success: valid,
          reason: checks,
        } = await Accounts.validateCreate(req, account);
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const existsPhone = await Accounts.findOne({
          phoneNumber: account.phoneNumber,
        });
        if (existsPhone) {
          return res.badRequest("phoneExists");
        }

        const existsEmail = await Accounts.findOne({ email: account.email });
        if (existsEmail) {
          return res.badRequest("emailExists");
        }

        const record = await Accounts.create(account);
        if (record.profileType === "staff") {
          const catalogue = await Catalogues.findOne({
            belongsToFaculty: record.additionalInfo.facultyId,
            belongsToDepartment: record.additionalInfo.departmentId,
          });

          const staff = await Catalogues.create({
            belongsToFaculty: record.additionalInfo.facultyId,
            belongsToDepartment: record.additionalInfo.departmentId,
            belongsToTeacher: record.accountId,
            catalogueName: record.fullNameWithPatronymic,
            belongsToCatalogueId: catalogue.catalogueId,
          });
        }

        return res.created({ accountId: record.accountId });
      }

      return res.badRequest({
        missingProps: "account",
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },

  createStaffMass: async (req, res) => {
    const shortid = require("shortid");
    const excelToJson = require("convert-excel-to-json");
    const fs = require("fs");
    req.file("file").upload(
      {
        dirname: require("path").resolve(
          sails.config.appPath,
          "assets/uploads"
        ),
      },
      async (err, uploadedFiles) => {
        if (err) return res.serverError(err);
        const array = [];
        for (let s of uploadedFiles) {
          const file = s.fd;
          const excel = excelToJson({
            sourceFile: file,
          });

          excel.Лист1.shift();
          fs.unlinkSync(file);
          let arrayOfStaff = excel.Лист1;
          for (let staff of arrayOfStaff) {
            const password = shortid.generate();
            const faculty = await Faculties.findOne({ facultyName: staff.G });
            const department = await Departments.findOne({
              departmentName: staff.H,
            });
            const phone = await Accounts.findOne({
              phoneNumber: staff.E,
            });
            const email = await Accounts.findOne({ email: staff.D });
            if (!faculty) {
              return res.badRequest(
                "Неправильное название факультета " + staff.G
              );
            }
            if (!department) {
              return res.badRequest("Неправильное название кафедры " + staff.H);
            }
            if (phone) {
              return res.badRequest(
                "Телефон уже существует " + phone.phoneNumber
              );
            }
            if (email) {
              return res.badRequest("Email уже существует " + email.email);
            }
            const date = staff.F;
            const dd = String(date.getDate()).padStart(2, "0");
            const mm = String(date.getMonth() + 1).padStart(2, "0"); //January is 0!
            const yyyy = date.getFullYear();
            const saveDate = mm + "-" + dd + "-" + yyyy;

            const data = {
              lastName: staff.A,
              firstName: staff.B,
              patronymic: staff.C,
              password: password,
              email: staff.D,
              phoneNumber: staff.E,
              dateOfBirth: saveDate,
              additionalInfo: {
                facultyId: faculty.facultyId,
                departmentId: department.departmentId,
                profileType: "staff",
                instructs: [],
              },
              region: "ru",
              fullName: staff.A + " " + staff.B,
              nameWithPatronymic: staff.A + " " + staff.C,
              fullNameWithPatronymic: staff.A + " " + staff.B + " " + staff.C,
              profileType: "staff",
              institutionId: req.session.authenticated.institutionId,
            };

            const result = await Accounts.create(data);

            array.push(result);
          }
        }
        return res.json(array);
      }
    );
  },

  createStudentsMass: async (req, res) => {
    const shortid = require("shortid");
    const excelToJson = require("convert-excel-to-json");
    const fs = require("fs");
    req.file("file").upload(
      {
        dirname: require("path").resolve(
          sails.config.appPath,
          "assets/uploads"
        ),
      },
      async (err, uploadedFiles) => {
        if (err) return res.serverError(err);
        const array = [];
        for (let s of uploadedFiles) {
          const file = s.fd;
          const excel = excelToJson({
            sourceFile: file,
          });

          excel.Лист1.shift();
          fs.unlinkSync(file);
          let arrayOfStudents = excel.Лист1;
          for (let student of arrayOfStudents) {
            const password = shortid.generate();
            const faculty = await Faculties.findOne({ facultyName: student.M });
            const department = await Departments.findOne({
              departmentName: student.N,
            });
            const course = await Courses.findOne({
              courseName: student.O,
            });
            const phone = await Accounts.findOne({
              phoneNumber: student.E,
            });
            const email = await Accounts.findOne({ email: student.D });
            if (!faculty) {
              return res.badRequest(
                "Неправильное название факультета " + staff.G
              );
            }
            if (!department) {
              return res.badRequest("Неправильное название кафедры " + staff.H);
            }
            if (!course) {
              return res.badRequest("Неправильное название курса " + student.O);
            }
            if (phone) {
              return res.badRequest(
                "Телефон уже существует " + phone.phoneNumber
              );
            }
            if (email) {
              return res.badRequest("Email уже существует " + email.email);
            }
            const parentDate = student.L;
            const dd = String(parentDate.getDate()).padStart(2, "0");
            const mm = String(parentDate.getMonth() + 1).padStart(2, "0"); //January is 0!
            const yyyy = parentDate.getFullYear();
            const saveParentDate = mm + "-" + dd + "-" + yyyy;

            const studentDate = student.F;
            const d = String(studentDate.getDate()).padStart(2, "0");
            const m = String(studentDate.getMonth() + 1).padStart(2, "0"); //January is 0!
            const yy = studentDate.getFullYear();
            const saveStudentDate = m + "-" + d + "-" + yy;

            const parents = {
              lastName: student.G,
              firstName: student.H,
              patronymic: student.I,
              email: student.J,
              password: password,
              phoneNumber: student.K,
              dateOfBirth: saveParentDate,
              additionalInfo: {
                profileType: "parent",
              },
              region: "ru",
              fullName: student.G + " " + student.H,
              nameWithPatronymic: student.G + " " + student.I,
              fullNameWithPatronymic:
                student.G + " " + student.H + " " + student.I,
              profileType: "parent",
              institutionId: req.session.authenticated.institutionId,
            };
            const raa = await Accounts.create(parents);
            const data = {
              lastName: student.A,
              firstName: student.B,
              patronymic: student.C,
              password: password,
              email: student.D,
              phoneNumber: student.E,
              dateOfBirth: saveStudentDate,
              additionalInfo: {
                facultyId: faculty.facultyId,
                courseId: course.courseId,
                departmentId: department.departmentId,
                profileType: "student",
                parentAccountId: raa.accountId,
              },
              region: "ru",
              fullName: student.A + " " + student.B,
              nameWithPatronymic: student.A + " " + student.C,
              fullNameWithPatronymic:
                student.A + " " + student.B + " " + student.C,
              profileType: "student",
              institutionId: req.session.authenticated.institutionId,
            };
            await Mail.send(
              student.D,
              "Пароль на платформе Ides24",
              "Ваш пароль: " + password
            );
            await Mail.send(
              student.J,
              "Пароль на платформе Ides24",
              "Ваш пароль: " + password
            );
            const result = await Accounts.create(data);
            array.push(raa, result);
          }
        }
        return res.json(array);
      }
    );
  },

  list: async (req, res) => {
    try {
      const locale = Locale("markers");

      const query = JSON.parse(req.params.query || '{"filter":{}}');

      const { success: valid, reason: checks } = await Accounts.validateList(
        req,
        query
      );

      if (!valid)
        return res.badRequest({
          details: checks,
          marker: locale.requestValidationFailed,
        });

      const { success, reason } = await Accounts.fetch(query);
      if (!success) return res.badRequest(reason);

      return res.ok(true, reason);
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
        const {
          success: valid,
          reason: checks,
        } = await Accounts.validateUpdate(req, filter, props);
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const existsPhone = await Accounts.findOne({
          phoneNumber: props.phoneNumber,
        });
        if (existsPhone && existsPhone.accountId !== filter.accountId) {
          return res.badRequest("phoneExists");
        }

        const existsEmail = await Accounts.findOne({ email: props.email });
        if (existsEmail && existsEmail.accountId !== filter.accountId) {
          return res.badRequest("emailExists");
        }
        console.log(filter, props);
        const { success, reason } = await Accounts.fillIn(filter, props);
        if (!success) return res.badRequest(reason);

        if (
          filter.accountId &&
          filter.accountId === req.session.authenticated.accountId
        )
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

  delete: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { accountId } = req.params;

      if (accountId) {
        const {
          success: valid,
          reason: checks,
        } = await Accounts.validateDestroy(req, accountId);
        const user = await Accounts.findOne({ accountId: accountId });
        if (user.profileType === "staff" && !valid) {
          return res.badRequest({
            details: checks,
            marker:
              "Невозможно удалить преподавателя, пока у него имеются преподаваемые предметы",
          });
        }
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const result = await Accounts.destroy({ accountId });
        if (!result.length)
          return res.badRequest({ marker: locale.noRecordsFound });

        return res.ok(true, { marker: locale.resourceHasBeenRemoved });
      }

      return res.badRequest({
        missingProps: ["accountId"],
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },
};
