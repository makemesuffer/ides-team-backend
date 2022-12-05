module.exports = {
  create: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { course } = req.body;

      if (course) {
        const { success: valid, reason: checks } = await Courses.validateCreate(
          req,
          course
        );
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const record = await Courses.create(course);
        const catalogue = await Catalogues.findOne({
          belongsToFaculty: record.belongsToFaculty,
          catalogueName: "Курсы",
        });

        await Catalogues.create({
          catalogueName: record.courseName,
          belongsToFaculty: record.belongsToFaculty,
          belongsToCourse: record.courseId,
          belongsToCatalogueId: catalogue.catalogueId,
        });
        return res.created({ courseId: record.courseId });
      }

      return res.badRequest({
        missingProps: "course",
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
      const { success: valid, reason: checks } = await Courses.validateList(
        req,
        query
      );
      if (!valid)
        return res.badRequest({
          details: checks,
          marker: locale.requestValidationFailed,
        });

      const { success, reason } = await Courses.fetch(query);
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
        const { success: valid, reason: checks } = await Courses.validateUpdate(
          req,
          filter,
          props
        );
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const catalogue = await Catalogues.findOne({
          belongsToCourse: filter.courseId,
        });

        const catalogueFaculty = await Catalogues.findOne({
          belongsToFaculty: props.belongsToFaculty,
          catalogueName: "Курсы",
        });

        const filterCatalogue = { catalogueId: catalogue.catalogueId };
        const propsCatalogue = {
          catalogueName: props.courseName,
          belongsToCatalogueId: catalogueFaculty.catalogueId,
        };

        await Catalogues.validateUpdate(req, filterCatalogue, propsCatalogue);
        await Catalogues.fillIn(filterCatalogue, propsCatalogue);

        const { success, reason } = await Courses.fillIn(filter, props);
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
      const { courseId } = req.params;

      if (courseId) {
        const {
          success: valid,
          reason: checks,
        } = await Courses.validateDestroy(req, courseId);
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });
        const catalogue = await Catalogues.findOne({
          belongsToCourse: courseId,
        });

        await Catalogues.destroy({ catalogueId: catalogue.catalogueId });
        const result = await Courses.destroy({ courseId });
        if (!result.length)
          return res.badRequest({ marker: locale.noRecordsFound });

        return res.ok(true, { marker: locale.resourceHasBeenRemoved });
      }

      return res.badRequest({
        missingProps: ["courseId"],
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },
};
