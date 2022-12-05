module.exports = {
  create: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { faculty } = req.body;

      if (faculty) {
        const {
          success: valid,
          reason: checks,
        } = await Faculties.validateCreate(req, faculty);
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const record = await Faculties.create(faculty);
        const catalogue = await Catalogues.create({
          catalogueName: record.facultyName,
          belongsToFaculty: record.facultyId,
          belongsToCatalogueId: null,
        });
        await Catalogues.create({
          catalogueName: "Кафедры",
          belongsToFaculty: record.facultyId,
          belongsToCatalogueId: catalogue.catalogueId,
        });
        await Catalogues.create({
          catalogueName: "Курсы",
          belongsToFaculty: record.facultyId,
          belongsToCatalogueId: catalogue.catalogueId,
        });
        return res.created({ facultyId: record.facultyId });
      }

      return res.badRequest({
        missingProps: "faculty",
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
      const { success: valid, reason: checks } = await Faculties.validateList(
        req,
        query
      );
      if (!valid)
        return res.badRequest({
          details: checks,
          marker: locale.requestValidationFailed,
        });

      const { success, reason } = await Faculties.fetch(query);
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
        } = await Faculties.validateUpdate(req, filter, props);
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const catalogue = await Catalogues.findOne({
          belongsToFaculty: filter.facultyId,
          belongsToCatalogueId: null,
        });
        const filterCatalogue = { catalogueId: catalogue.catalogueId };
        const propsCatalogue = {
          catalogueName: props.facultyName,
        };

        await Catalogues.validateUpdate(req, filterCatalogue, propsCatalogue);
        await Catalogues.fillIn(filterCatalogue, propsCatalogue);

        const { success, reason } = await Faculties.fillIn(filter, props);
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
      const { facultyId } = req.params;

      if (facultyId) {
        const {
          success: valid,
          reason: checks,
        } = await Faculties.validateDestroy(req, facultyId);
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });
        const catalogue = await Catalogues.findOne({
          belongsToFaculty: facultyId,
          belongsToCatalogueId: null,
        });

        await Catalogues.destroy({ catalogueId: catalogue.catalogueId });
        const result = await Faculties.destroy({ facultyId });
        if (!result.length)
          return res.badRequest({ marker: locale.noRecordsFound });

        return res.ok(true, { marker: locale.resourceHasBeenRemoved });
      }

      return res.badRequest({
        missingProps: ["facultyId"],
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },
};
