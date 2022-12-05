const { NODE_ENV, ADMIN_PASS, FRESH_DB, SUDO_FRESH_DB } = process.env;

const faker = require("faker");
const moment = require("moment");
const _ = require("lodash");

const Secret = require("../api/services/Secret.js");
const Constants = require("./constants.js");

const permissions = require("./accountPermissions.js");
const regionSpecifics = require("./regionSpecifics.js");
const Utils = require("../api/services/Utils.js");

module.exports = {
  freshDb: async () => {
    try {
      if ((NODE_ENV !== "production" && FRESH_DB) || SUDO_FRESH_DB) {
        sails.log.info("refreshing db");
        const models = [
          Accounts,
          Assignments,
          Events,
          Chats,
          Invites,
          Institutions,
          Faculties,
          Departments,
          Catalogues,
          Courses,
          Groups,
          Disciplines,
          Plans,
        ];

        for (const model of models) {
          await model.destroy({});
        }
      }
    } catch (e) {
      throw new Error(e);
    }
  },
  clean: async (instName) => {
    try {
      const cleanReqs = [];
      const models = [
        Accounts,
        Assignments,
        Events,
        Chats,
        Invites,
        Institutions,
        Faculties,
        Departments,
        Catalogues,
        Courses,
        Groups,
        Disciplines,
        Plans,
      ];

      const inst = await Institutions.findOne({ name: instName });
      if (!inst) return;

      models.forEach((model) =>
        cleanReqs.push(
          new Promise(async (resolve) => {
            await model.destroy({ institutionId: inst.institutionId });
            resolve();
          })
        )
      );

      await Promise.all(cleanReqs);
    } catch (e) {
      throw new Error(e);
    }
  },
  ensureAccountExists: async (accRec) => {
    try {
      const acc = await Accounts.findOne({ email: accRec.email });
      if (!acc) await Accounts.create(accRec);
      sails.log.info(
        `ensured ${accRec.email} account with ${accRec.profileType} role exists`
      );
    } catch (e) {
      throw new Error(e);
    }
  },
  ensureInstitutionExists: async (instRec) => {
    try {
      const inst = await Institutions.findOne({ name: instRec.name });
      if (!inst) await Institutions.create(instRec);
      sails.log.info(`ensured ${instRec.name} institution exists`);
    } catch (e) {
      throw new Error(e);
    }
  },
  generateSampleUsers: async (
    institutionName,
    numberOfAccounts,
    profileType
  ) => {
    try {
      const inst = await Institutions.findOne({ name: institutionName });
      const generateReqs = [];

      for (let i = 0; i < numberOfAccounts; i++) {
        if (profileType === Constants.staff) {
          generateReqs.push(
            new Promise(async (resolve) => {
              const faculties = await Faculties.find({
                institutionId: inst.institutionId,
              });
              const randomFaculty = _.sampleSize([...faculties], 1)[0];

              const departments = await Departments.find({
                institutionId: inst.institutionId,
                belongsToFaculty: randomFaculty.facultyId,
              });
              const randomDepartment = _.sampleSize([...departments], 1)[0];

              const account = await Accounts.create(
                new user({
                  facultyId: randomFaculty.facultyId,
                  departmentId: randomDepartment.departmentId,
                  instructs: [],
                })
              );

              resolve(account);
            })
          );
        }

        if (profileType === Constants.student) {
          generateReqs.push(
            new Promise(async (resolve) => {
              const faculties = await Faculties.find({
                institutionId: inst.institutionId,
              });
              const randomFaculty = _.sampleSize([...faculties], 1)[0];

              const groups = await Groups.find({
                institutionId: inst.institutionId,
              });
              const randomGroup = _.sampleSize([...groups], 1)[0];

              const departments = await Departments.find({
                belongsToFaculty: randomFaculty.facultyId,
              });
              const randomDepartment = _.sampleSize([...departments], 1)[0];

              const account = await Accounts.create(
                new user({
                  facultyId: randomFaculty.facultyId,
                  departmentId: randomDepartment.departmentId,
                  groupId: randomGroup.groupId,
                  status: _.sampleSize(
                    [Constants.approved, Constants.enrolled],
                    1
                  )[0],
                })
              );

              resolve(account);
            })
          );
        }

        if (profileType === Constants.parent) {
          generateReqs.push(Accounts.create(new user()));
        }

        function user(additionalInfo) {
          return {
            profileType,
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            patronymic: faker.name.firstName(),
            email: faker.internet.exampleEmail().toLowerCase(),
            password: faker.lorem.word(),
            institutionId: inst.institutionId,
            region: inst.region,
            additionalInfo,
          };
        }
      }

      await Promise.all(generateReqs);
      sails.log.info(
        `generated ${numberOfAccounts} users with ${profileType} for ${inst.name}`
      );
    } catch (e) {
      throw new Error(e);
    }
  },
  generateSampleEvents: async (institutionName, numberOfEvents) => {
    try {
      const inst = await Institutions.findOne({ name: institutionName });
      const weekStart = moment().utcOffset(0).startOf("isoWeek");
      const generateReqs = [];

      let day = 1;
      let latestEventEndDate = null;

      for (let i = 0; i < numberOfEvents; i++) {
        latestEventEndDate = moment(event.endDate);
        if (latestEventEndDate && latestEventEndDate.hour() > 21) day += 1;

        generateReqs.push(
          new Promise(async (resolve) => {
            const groups = await Groups.find({
              institutionId: inst.institutionId,
            });
            const randomGroup = _.sampleSize([...groups], 1)[0];
            const relatedCourse = await Courses.findOne({
              courseId: randomGroup.belongsToCourse,
            });

            const relatedPlan = await Plans.populate(
              await Plans.findOne({ belongsToCourse: relatedCourse.courseId })
            );
            const randomDiscipline =
              relatedPlan.disciplinesFetched[
                relatedPlan.disciplines[
                  Utils.random.integer(0, relatedPlan.disciplines.length - 1)
                ]
              ];

            const { reason: fetchedInstructor } = await Accounts.fetch({
              filter: {
                "additionalInfo.instructs": {
                  $in: [randomDiscipline.disciplineId],
                },
              },
            });

            const belongsToDiscipline = randomDiscipline.disciplineId;
            const topic =
              randomDiscipline.topics[
                Utils.random.integer(0, randomDiscipline.topics.length - 1)
              ];
            const belongsToGroup = randomGroup.groupId;
            const instructor = fetchedInstructor[0].accountId;

            const occasion = await Events.create(
              new event(belongsToDiscipline, topic, belongsToGroup, instructor)
            );

            resolve(occasion);
          })
        );

        function event(belongsToDiscipline, topic, belongsToGroup, instructor) {
          return {
            belongsToDiscipline,
            topic,
            belongsToGroup,
            instructor,
            eventName: Utils.random.word(),
            eventType: _.sampleSize(
              [Constants.online, Constants.offline],
              1
            )[0],
            startDate: latestEventEndDate
              ? latestEventEndDate.clone().add(10, "m").valueOf()
              : weekStart
                  .clone()
                  .weekday(day)
                  .set("hour", 9)
                  .set("minute", 0)
                  .valueOf(),
            endDate: latestEventEndDate
              ? latestEventEndDate.clone().add(90, "m").valueOf()
              : weekStart
                  .clone()
                  .weekday(day)
                  .set("hour", 10)
                  .set("minute", 20)
                  .valueOf(),
            institutionId: inst.institutionId,
          };
        }
      }

      await Promise.all(generateReqs);
      sails.log.info(`generated ${numberOfEvents} events for ${inst.name}`);
    } catch (e) {
      throw new Error(e);
    }
  },
  generateSampleFaculties: async (institutionName, numberOfFaculties) => {
    try {
      const inst = await Institutions.findOne({ name: institutionName });
      const generateReqs = [];

      for (let i = 0; i < numberOfFaculties; i++) {
        const faculty = {
          facultyName: Utils.random.word(),
          institutionId: inst.institutionId,
        };
        generateReqs.push(Faculties.create(faculty));
      }

      await Promise.all(generateReqs);
      sails.log.info(
        `generated ${numberOfFaculties} faculties for ${inst.name}`
      );
    } catch (e) {
      throw new Error(e);
    }
  },
  generateSampleDepartments: async (institutionName, departmentsPerFaculty) => {
    try {
      const inst = await Institutions.findOne({ name: institutionName });
      const faculties = await Faculties.find({
        institutionId: inst.institutionId,
      });

      let generateReqs = [];

      for (let i = 0; i < faculties.length; i++) {
        for (let x = 0; x < departmentsPerFaculty; x++) {
          generateReqs.push(Departments.create(new department()));
          function department() {
            return {
              departmentName: Utils.random.word(),
              institutionId: inst.institutionId,
              belongsToFaculty: faculties[i].facultyId,
            };
          }
        }
      }

      await Promise.all(generateReqs);
      sails.log.info(
        `generated ${generateReqs.length} departments for ${inst.name}`
      );
    } catch (e) {
      throw new Error(e);
    }
  },
  generateSampleCourses: async (institutionName, coursesPerDepartment) => {
    try {
      const inst = await Institutions.findOne({ name: institutionName });
      const departments = await Departments.find({
        institutionId: inst.institutionId,
      });
      let generateReqs = [];

      for (let i = 0; i < departments.length; i++) {
        for (let x = 0; x < coursesPerDepartment; x++) {
          generateReqs.push(Courses.create(new course()));
          function course() {
            return {
              courseName: Utils.random.word(),
              institutionId: inst.institutionId,
              belongsToFaculty: departments[i].belongsToFaculty,
              belongsToDepartment: departments[i].departmentId,
            };
          }
        }
      }

      await Promise.all(generateReqs);
      sails.log.info(
        `generated ${generateReqs.length} courses for ${inst.name}`
      );
    } catch (e) {
      throw new Error(e);
    }
  },
  generateSampleGroups: async (institutionName, groupsPerCourse) => {
    try {
      const inst = await Institutions.findOne({ name: institutionName });
      const courses = await Courses.find({ institutionId: inst.institutionId });
      let generateReqs = [];

      for (let i = 0; i < courses.length; i++) {
        for (let x = 0; x < groupsPerCourse; x++) {
          generateReqs.push(Groups.create(new group()));
          function group() {
            return {
              groupName: Utils.random.word(),
              institutionId: inst.institutionId,
              belongsToFaculty: courses[i].belongsToFaculty,
              belongsToDepartment: courses[i].belongsToDepartment,
              belongsToCourse: courses[i].courseId,
              status: Utils.random.integer(0, 1)
                ? Constants.vacant
                : Constants.formed,
              startDate: moment()
                .utcOffset(0)
                .startOf("year")
                .set("month", 8)
                .valueOf(),
              endDate: moment()
                .utcOffset(0)
                .startOf("year")
                .set("month", 5)
                .valueOf(),
            };
          }
        }
      }

      await Promise.all(generateReqs);
      sails.log.info(
        `generated ${generateReqs.length} groups for ${inst.name}`
      );
    } catch (e) {
      throw new Error(e);
    }
  },
  generateSampleDisciplines: async (institutionName, numberOfDisciplines) => {
    sails.log.info(
      `generating disciplines and updating instructor accounts ...`
    );
    const inst = await Institutions.findOne({ name: institutionName });

    for (let i = 0; i < numberOfDisciplines; i++) {
      const subject = await Disciplines.create(new discipline());
      const staffMembers = await Accounts.find({
        institutionId: inst.institutionId,
        profileType: Constants.staff,
      });
      const randomInstructor = _.sampleSize(staffMembers, 1)[0];

      await Accounts.fillIn(
        { accountId: randomInstructor.accountId },
        {
          "additionalInfo.instructs": _.uniq([
            ...randomInstructor.additionalInfo.instructs,
            subject.disciplineId,
          ]),
        }
      );

      function discipline() {
        return {
          disciplineName: Utils.random.word(),
          description: Utils.random.message(),
          institutionId: inst.institutionId,
          topics: [...new Array(Utils.random.integer(5, 15))].map(
            () => new topic()
          ),
        };
      }

      function topic() {
        return {
          type: _.sampleSize([Constants.lecture, Constants.seminar], 1)[0],
          name: Utils.random.message(),
        };
      }
    }

    sails.log.info(
      `generated ${numberOfDisciplines} disciplines for ${inst.name}`
    );
  },
  generateSamplePlans: async (institutionName, plansPerCourse) => {
    const inst = await Institutions.findOne({ name: institutionName });
    const courses = await Courses.find({ institutionId: inst.institutionId });
    const disciplines = await Disciplines.find({
      institutionId: inst.institutionId,
    });

    const generateReqs = [];

    for (let i = 0; i < courses.length; i++) {
      for (let x = 0; x < plansPerCourse; x++) {
        generateReqs.push(Plans.create(new plan()));

        function plan() {
          return {
            planName: Utils.random.word(),
            belongsToFaculty: courses[i].belongsToFaculty,
            belongsToDepartment: courses[i].belongsToDepartment,
            belongsToCourse: courses[i].courseId,
            institutionId: inst.institutionId,
            disciplines: _.sampleSize(
              [...disciplines.map((d) => d.disciplineId)],
              Utils.random.integer(5, 12)
            ),
          };
        }
      }
    }

    await Promise.all(generateReqs);
    sails.log.info(`generated ${generateReqs.length} plans for ${inst.name}`);
  },
  generateSampleAssignments: async (
    institutionName,
    assignmentPerDiscipline
  ) => {
    const inst = await Institutions.findOne({ name: institutionName });
    const disciplines = await Disciplines.find({
      institutionId: inst.institutionId,
    });
    const groups = await Groups.find({ institutionId: inst.institutionId });
    const instructors = await Accounts.find({
      institutionId: inst.institutionId,
      profileType: Constants.staff,
    });

    const generateAssignmentReqs = [];
    const updateStaffReqs = [];

    for (let i = 0; i < disciplines.length; i++) {
      let diciplineInstructor = instructors.filter((member) =>
        _.get(member, "additionalInfo.instructs", []).includes(
          disciplines[i].disciplineId
        )
      )[0];

      if (!diciplineInstructor) {
        const randomInstructorIndex = Number(
          Utils.random.integer(0, instructors.length - 1)
        );
        const randomInstructor = instructors[randomInstructorIndex];
        const randomInstructorTutors = _.get(
          randomInstructor,
          "additionalInfo.instructs",
          []
        );

        instructors[randomInstructorIndex] = _.set(
          randomInstructor,
          "additionalInfo.instructs",
          _.uniq([...randomInstructorTutors, disciplines[i].disciplineId])
        );

        diciplineInstructor = instructors[randomInstructorIndex];
      }

      for (let x = 0; x < assignmentPerDiscipline; x++) {
        generateAssignmentReqs.push(Assignments.create(new assignment()));

        function assignment() {
          return {
            belongsToGroup: _.sampleSize(groups, 1)[0].groupId,
            belongsToInstructor: diciplineInstructor.accountId,
            belongsToDiscipline: disciplines[i].disciplineId,
            topic: Utils.random.word(),
            content: {},
            format: _.sampleSize(
              [Constants.file, Constants.test, Constants.text],
              1
            )[0],
            startDate: moment().utcOffset(0).startOf("isoWeek").valueOf(),
            endDate: moment().utcOffset(0).endOf("month").valueOf(),
            institutionId: inst.institutionId,
          };
        }
      }
    }

    instructors
      .filter((i) => _.get(i, "additionalInfo.instructs"))
      .forEach((member) =>
        updateStaffReqs.push(
          Accounts.fillIn(
            { accountId: member.accountId },
            { "additionalInfo.instructs": member.additionalInfo.instructs }
          )
        )
      );

    await Promise.all([...generateAssignmentReqs, ...updateStaffReqs]);
    sails.log.info(
      `generated ${generateAssignmentReqs.length} assignments for ${inst.name}`
    );
  },
  generateSampleCatalogues: async (institutionName) => {
    const inst = await Institutions.findOne({ name: institutionName });
    const relatedAccounts = await Accounts.find({
      institutionId: inst.institutionId,
    });

    const generateReqs = [];

    relatedAccounts.forEach(({ accountId }) => {
      generateReqs.push(Catalogues.create(new catalogue()));

      function contentItem(direct) {
        const type =
          direct || _.sampleSize([Constants.file, Constants.folder], 1)[0];

        if (type === Constants.file)
          return {
            type: Constants.file,
            name: Utils.random.word(),
            format: _.sampleSize(["pdf", "word", "mp4"], 1)[0],
            url: "someUrl",
          };

        return {
          type: Constants.folder,
          name: Utils.random.word(),
          contains: [...new Array(Utils.random.integer(4, 10))].map(
            () => new contentItem(Constants.file)
          ),
        };
      }

      function catalogue() {
        return {
          belongsToAccount: accountId,
          institutionId: inst.institutionId,
          content: [...new Array(Utils.random.integer(4, 10))].map(
            () => new contentItem()
          ),
        };
      }
    });

    await Promise.all(generateReqs);
    sails.log.info(
      `generated ${generateReqs.length} catalogues for ${inst.name}`
    );
  },
  distanceLlc: {
    orgRecord: {
      name: "Distance LLC",
      region: regionSpecifics.ru.regionName,
      orgType: Constants.distanceLLC,
      institutionId: Constants.distanceLLC,
    },
    defaultAdminAcc: {
      profileType: Constants.idesAdmin,
      password: Secret.encrypt(ADMIN_PASS || "distance"),
      email: "admin@ides24.com",
      phoneNumber: "+7 (000) 000-00-00",
      region: regionSpecifics.ru.regionName,
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      patronymic: faker.name.firstName(),
      permissions: permissions.idesAdmin,
      institutionId: Constants.distanceLLC,
    },
  },
  ru: {
    school: {
      orgRecord: {
        name: "School Demo RU",
        region: regionSpecifics.ru.regionName,
        orgType: Constants.school,
        additionalInfo: {
          utcOffset: 180,
        },
        institutionId: "schoolDemoRu",
      },
      defaultAdminAcc: {
        profileType: Constants.schoolAdmin,
        password: Secret.encrypt("schoolDemoRu"),
        email: "schooldemoru@ides24.com",
        region: regionSpecifics.ru.regionName,
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        patronymic: faker.name.firstName(),
        permissions: permissions.schoolAdmin,
        institutionId: "schoolDemoRu",
      },
    },
    university: {
      orgRecord: {
        name: "Uni Demo RU",
        region: regionSpecifics.ru.regionName,
        orgType: Constants.university,
        additionalInfo: {
          utcOffset: 180,
        },
        institutionId: "uniDemoRu",
      },
      defaultAdminAcc: {
        profileType: Constants.schoolAdmin,
        password: Secret.encrypt("uniDemoRu"),
        email: "unidemoru@ides24.com",
        region: regionSpecifics.ru.regionName,
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        patronymic: faker.name.firstName(),
        permissions: permissions.idesAdmin,
        institutionId: "uniDemoRu",
      },
    },
  },
};
