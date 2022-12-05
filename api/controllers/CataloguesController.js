module.exports = {
  create: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { catalogue } = req.body;
      const { authenticated } = req.session;
      if (catalogue) {
        const {
          success: valid,
          reason: checks,
        } = await Catalogues.validateCreate(req, catalogue);
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });
        if (authenticated.profileType === "staff") {
          if (catalogue.type == "folder") {
            const record = await Catalogues.create({
              catalogueName: catalogue.catalogueName,
              type: catalogue.type,
              belongsToTeacher: authenticated.accountId,
              belongsToCatalogueId: catalogue.belongsToCatalogueId || null,
              isMy: true,
            });
            return res.created({
              record,
            });
          }
          if (catalogue.type == "file") {
            const record = await Catalogues.create({
              catalogueName: catalogue.catalogueName,
              type: catalogue.type,
              url: catalogue.url,
              size: catalogue.size,
              belongsToTeacher: authenticated.accountId,
              belongsToCatalogueId: catalogue.belongsToCatalogueId || null,
              isMy: true,
            });
            return res.created({
              record,
            });
          }

          return res.created({
            record,
          });
        }
        const record = await Catalogues.create(catalogue);
        return res.created({
          record,
        });
      }

      return res.badRequest({
        missingProps: "catalogue",
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },

  list: async (req, res) => {
    const locale = Locale("markers");
    const { authenticated } = req.session;
    if (authenticated.profileType === "student") {
      try {
        const course = authenticated.additionalInfo.courseId;
        const plans = await Plans.find({ belongsToCourse: course });
        const arrayOfTasks = [];
        for (let plan of plans) {
          const disciplines = plan.tempDisciplines;
          const dataOfLectures = {
            type: "folder",
            name: "Лекции",
            contains: plan.tempDisciplines,
          };
          for (let discipline of disciplines) {
            const topics = discipline.topics;
            discipline.contains = discipline.topics;
            discipline.type = "folder";
            discipline.name = discipline.disciplineName;
            for (let topic of topics) {
              topic.type = "folder";
              const materials = await Events.findOne({
                belongsToDiscipline: discipline.disciplineId,
              }).where({ "topic.name": topic.name });

              if (materials) {
                topic.contains = materials.relatedMaterials;
              } else topic.contains = [];
            }
          }
          arrayOfTasks.push(dataOfLectures);
        }
        for (let plan of plans) {
          const disciplines = plan.tempDisciplines;
          const dataOfHomeWork = {
            type: "folder",
            name: "Домашние задания",
            contains: plan.tempDisciplines,
          };
          for (let discipline of disciplines) {
            const topics = discipline.topics;
            discipline.contains = discipline.topics;
            discipline.type = "folder";
            discipline.name = discipline.disciplineName;
            delete discipline.disciplineName;
            delete discipline.topics;
            for (let topic of topics) {
              topic.type = "folder";
              const materials = await Assignments.findOne({
                belongsToDiscipline: discipline.disciplineId,
                topic: topic.name,
              });

              if (materials) {
                topic.contains = materials.materials;
              } else topic.contains = [];
            }
          }
          arrayOfTasks.push(dataOfHomeWork);
        }
        const generalDepartments = await Catalogues.findOne().where({
          belongsToCourse: null,
          belongsToFaculty: authenticated.additionalInfo.facultyId,
          belongsToDepartment: authenticated.additionalInfo.departmentId,
          belongsToGroup: null,
          belongsToTeacher: null,
        });

        const generalGroups = await Catalogues.findOne().where({
          belongsToCourse: null,
          belongsToFaculty: authenticated.additionalInfo.facultyId,
          belongsToDepartment: authenticated.additionalInfo.departmentId,
          belongsToGroup: authenticated.additionalInfo.groupId,
          belongsToTeacher: null,
        });
        if (generalDepartments || generalGroups) {
          const dataOfGeneral = {
            name: "Общие",
            type: "folder",
            contains: generalDepartments.contains && generalGroups.contains,
          };
          arrayOfTasks.push(dataOfGeneral);
        } else {
          const dataOfGeneral = {
            name: "Общие",
            type: "folder",
            contains: [],
          };
          arrayOfTasks.push(dataOfGeneral);
        }

        return res.send({ success: true, reason: [{ content: arrayOfTasks }] });
      } catch (e) {
        return res.error(e);
      }
    }
    if (authenticated.profileType === "staff") {
      try {
        const catalogue = await Catalogues.find().where({
          belongsToTeacher: authenticated.accountId,
          isMy: true,
          belongsToCatalogueId: null,
        });
        return res.send({ success: true, reason: [{ content: catalogue }] });
      } catch (e) {
        return res.error(e);
      }
    } else if (authenticated.profileType === "idesAdmin") {
      try {
        const faculties = await Catalogues.find({}).where({
          belongsToCourse: null,
          belongsToDepartment: null,
          belongsToCatalogueId: null,
          belongsToTeacher: null,
          belongsToDiscipline: null,
          belongsToGroup: null,
        });

        return res.send({ success: true, reason: [{ content: faculties }] });
      } catch (e) {
        return res.error(e);
      }
    }
  },

  listGeneral: async (req, res) => {
    const { authenticated } = req.session;
    if (authenticated.profileType === "student") {
      try {
        const faculty = await Catalogues.findOne({}).where({
          belongsToCourse: null,
          belongsToDepartment: null,
          belongsToCatalogueId: null,
          belongsToTeacher: null,
          belongsToDiscipline: null,
          belongsToGroup: null,
          belongsToFaculty: authenticated.additionalInfo.facultyId,
        });

        return res.send({ success: true, reason: [{ content: [faculty] }] });
      } catch (e) {
        return res.error(e);
      }
    }
    if (authenticated.profileType === "staff") {
      try {
        const faculty = await Catalogues.findOne({}).where({
          belongsToCourse: null,
          belongsToDepartment: null,
          belongsToCatalogueId: null,
          belongsToTeacher: null,
          belongsToDiscipline: null,
          belongsToGroup: null,
          belongsToFaculty: authenticated.additionalInfo.facultyId,
        });
        console.log(faculty);
        // const catalogue = await Catalogues.findOne({}).where({
        //   belongsToTeacher: authenticated.accountId,
        // });
        // let general = [];
        // const x = await Catalogues.find({
        //   belongsToFaculty: null,
        //   belongsToCatalogueId: null,
        //   belongsToGroup: null,
        //   belongsToDiscipline: null,
        //   belongsToTeacher: null,
        // });
        // for (let r of x) {
        //   general.push(r);
        // }

        // const disc = await Catalogues.find({}).where({
        //   belongsToCatalogueId: catalogue.catalogueId,
        // });
        // const faculty = await Catalogues.findOne({}).where({
        //   belongsToFaculty: authenticated.additionalInfo.facultyId,
        // });
        // const f = await Catalogues.find({}).where({
        //   belongsToCatalogueId: faculty.catalogueId,
        //   catalogueName: { $nin: ["Курсы", "Кафедры"] },
        // });
        // for (let k of f) {
        //   general.push(k);
        // }
        // const s = await Catalogues.findOne({}).where({
        //   belongsToCatalogueId: faculty.catalogueId,
        //   catalogueName: "Кафедры",
        // });
        // const l = await Catalogues.find({}).where({
        //   belongsToCatalogueId: s.catalogueId,
        //   belongsToDepartment: null,
        // });
        // for (let g of l) {
        //   general.push(g);
        // }

        // const j = await Catalogues.find({}).where({
        //   belongsToCatalogueId: catalogue.belongsToCatalogueId,
        //   belongsToDepartment: null,
        //   belongsToTeacher: null,
        // });

        // for (let h of j) {
        //   general.push(h);
        // }
        // for (let p of disc) {
        //   general.push(p);
        // }
        return res.send({ success: true, reason: [{ content: [faculty] }] });
      } catch (e) {
        return res.error(e);
      }
    }
  },

  listStudent: async (req, res) => {
    const { authenticated } = req.session;
    if (authenticated.profileType === "student") {
      try {
        const catalogue = await Catalogues.find({}).where({
          belongsToGroup: authenticated.additionalInfo.groupId,
          belongsToCatalogueId: null,
        });

        return res.send({ success: true, reason: [{ content: catalogue }] });
      } catch (e) {
        return res.error(e);
      }
    }
  },

  getById: async (req, res) => {
    const { authenticated } = req.session;
    const { catalogueId } = req.params;
    if (authenticated.profileType === "idesAdmin") {
      try {
        const result = await Catalogues.find({}).where({
          belongsToCatalogueId: catalogueId,
        });

        return res.send({ success: true, reason: [{ content: result }] });
      } catch (e) {
        return res.error(e);
      }
    }
    if (authenticated.profileType === "staff") {
      try {
        const result = await Catalogues.find({}).where({
          belongsToCatalogueId: catalogueId,
        });

        return res.send({ success: true, reason: [{ content: result }] });
      } catch (e) {
        return res.error(e);
      }
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
  getGeneralById: async (req, res) => {
    const { authenticated } = req.session;
    const { catalogueId } = req.params;
    if (authenticated.profileType === "staff") {
      let content = [];
      try {
        const result = await Catalogues.find({}).where({
          belongsToCatalogueId: catalogueId,
        });
        const kaf = await Catalogues.findOne({}).where({
          belongsToDepartment: authenticated.additionalInfo.departmentId,
          belongsToFaculty: authenticated.additionalInfo.facultyId,
        });
        const kafName = await Catalogues.findOne({}).where({
          belongsToFaculty: authenticated.additionalInfo.facultyId,
          catalogueName: "Кафедры",
        });
        const teacher = await Catalogues.findOne({}).where({
          belongsToFaculty: authenticated.additionalInfo.facultyId,
          belongsToTeacher: authenticated.accountId,
        });
        if (catalogueId === kaf.catalogueId) {
          content.push(teacher);
        }
        if (catalogueId === kafName.catalogueId) {
          content.push(kaf);
        }
        for (let res of result) {
          if (res.type == "file") {
            content.push(res);
          }
          if (res.catalogueName == "Кафедры") {
            content.push(res);
          }
        }
        return res.send({ success: true, reason: [{ content: content }] });
      } catch (e) {
        return res.error(e);
      }
    }
    if (authenticated.profileType === "student") {
      let content = [];
      try {
        const result = await Catalogues.find({}).where({
          belongsToCatalogueId: catalogueId,
        });
        const course = await Catalogues.findOne({}).where({
          belongsToCourse: authenticated.additionalInfo.courseId,
          belongsToFaculty: authenticated.additionalInfo.facultyId,
        });
        const kafName = await Catalogues.findOne({}).where({
          belongsToFaculty: authenticated.additionalInfo.facultyId,
          catalogueName: "Курсы",
        });
        const group = await Catalogues.findOne({}).where({
          belongsToGroup: authenticated.additionalInfo.groupId,
        });
        if (catalogueId === course.catalogueId) {
          content.push(group);
        }
        if (catalogueId === kafName.catalogueId) {
          content.push(course);
        }
        for (let res of result) {
          if (res.type == "file") {
            content.push(res);
          }
          if (res.catalogueName == "Курсы") {
            content.push(res);
          }
        }
        return res.send({ success: true, reason: [{ content: content }] });
      } catch (e) {
        return res.error(e);
      }
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
        } = await Catalogues.validateUpdate(req, filter, props);
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const { success, reason } = await Catalogues.fillIn(filter, props);
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
      const { catalogues } = req.body;

      if (catalogues) {
        for (let catalogueId of catalogues) {
          const {
            success: valid,
            reason: checks,
          } = await Catalogues.validateDestroy(req, catalogueId);
          if (!valid)
            return res.badRequest({
              details: checks,
              marker: locale.requestValidationFailed,
            });

          const result = await Catalogues.destroy({ catalogueId });
          if (!result.length)
            return res.badRequest({ marker: locale.noRecordsFound });
        }
        return res.ok(true, { marker: locale.resourceHasBeenRemoved });
      }

      return res.badRequest({
        missingProps: ["catalogueId"],
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },
};
