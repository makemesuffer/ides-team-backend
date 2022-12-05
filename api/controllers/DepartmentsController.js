module.exports = {
  create: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { department } = req.body;

      if (department) {
        const {
          success: valid,
          reason: checks,
        } = await Departments.validateCreate(req, department);
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const record = await Departments.create(department);
        const catalogue = await Catalogues.findOne({
          belongsToFaculty: record.belongsToFaculty,
          catalogueName: "Кафедры",
        });

        await Catalogues.create({
          catalogueName: record.departmentName,
          belongsToFaculty: record.belongsToFaculty,
          belongsToDepartment: record.departmentId,
          belongsToCatalogueId: catalogue.catalogueId,
        });
        return res.created({ departmentId: record.departmentId });
      }

      return res.badRequest({
        missingProps: "department",
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
      const { success: valid, reason: checks } = await Departments.validateList(
        req,
        query
      );
      if (!valid)
        return res.badRequest({
          details: checks,
          marker: locale.requestValidationFailed,
        });

      const { success, reason } = await Departments.fetch(query);
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
        } = await Departments.validateUpdate(req, filter, props);
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const { success, reason } = await Departments.fillIn(filter, props);

        const catalogue = await Catalogues.findOne({
          belongsToDepartment: filter.departmentId,
        });

        const catalogueFaculty = await Catalogues.findOne({
          belongsToFaculty: props.belongsToFaculty,
          catalogueName: "Кафедры",
        });

        const filterCatalogue = { catalogueId: catalogue.catalogueId };
        const propsCatalogue = {
          catalogueName: props.departmentName,
          belongsToCatalogueId: catalogueFaculty.catalogueId,
        };

        await Catalogues.validateUpdate(req, filterCatalogue, propsCatalogue);
        await Catalogues.fillIn(filterCatalogue, propsCatalogue);

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
      const { departmentId } = req.params;

      if (departmentId) {
        const {
          success: valid,
          reason: checks,
        } = await Departments.validateDestroy(req, departmentId);
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });
        const catalogue = await Catalogues.findOne({
          belongsToDepartment: departmentId,
        });

        await Catalogues.destroy({ catalogueId: catalogue.catalogueId });
        const result = await Departments.destroy({ departmentId });
        if (!result.length)
          return res.badRequest({ marker: locale.noRecordsFound });

        return res.ok(true, { marker: locale.resourceHasBeenRemoved });
      }

      return res.badRequest({
        missingProps: ["departmentId"],
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },
};
