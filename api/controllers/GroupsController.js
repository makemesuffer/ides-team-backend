module.exports = {
  create: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { group } = req.body;

      if (group) {
        const { success: valid, reason: checks } = await Groups.validateCreate(
          req,
          group
        );
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const record = await Groups.create(group);
        const catalogue = await Catalogues.findOne({
          belongsToFaculty: record.belongsToFaculty,
          belongsToCourse: record.belongsToCourse,
        });
        await Catalogues.create({
          catalogueName: record.groupName,
          belongsToGroup: record.groupId,
          belongsToCatalogueId: catalogue.catalogueId,
        });
        return res.created({ groupId: record.groupId });
      }

      return res.badRequest({
        missingProps: "group",
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
      const { success: valid, reason: checks } = await Groups.validateList(
        req,
        query
      );
      if (!valid)
        return res.badRequest({
          details: checks,
          marker: locale.requestValidationFailed,
        });

      const { success, reason } = await Groups.fetch(query);
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
        const { success: valid, reason: checks } = await Groups.validateUpdate(
          req,
          filter,
          props
        );
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const { success, reason } = await Groups.fillIn(filter, props);
        if (!success) return res.badRequest(reason);

        const catalogue = await Catalogues.findOne({
          belongsToGroup: props.groupId,
        });

        const catalogueCourse = await Catalogues.findOne({
          belongsToCourse: props.belongsToCourse,
        });

        const filterCatalogue = { catalogueId: catalogue.catalogueId };
        const propsCatalogue = {
          catalogueName: props.groupName,
          belongsToCatalogueId: catalogueCourse.catalogueId,
        };

        await Catalogues.validateUpdate(req, filterCatalogue, propsCatalogue);
        await Catalogues.fillIn(filterCatalogue, propsCatalogue);

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
      const { groupId } = req.params;

      if (groupId) {
        const { success: valid, reason: checks } = await Groups.validateDestroy(
          req,
          groupId
        );
        const catalogue = await Catalogues.findOne({
          belongsToGroup: groupId,
        });

        await Catalogues.destroy({ catalogueId: catalogue.catalogueId });
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const result = await Groups.destroy({ groupId });
        if (!result.length)
          return res.badRequest({ marker: locale.noRecordsFound });

        return res.ok(true, { marker: locale.resourceHasBeenRemoved });
      }

      return res.badRequest({
        missingProps: ["groupId"],
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },
};
