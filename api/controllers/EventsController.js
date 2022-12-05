module.exports = {
  create: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { event } = req.body;

      if (event) {
        const { success: valid, reason: checks } = await Events.validateCreate(
          req,
          event
        );
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const record = await Events.create(event);

        const catalogue = await Catalogues.findOne({
          belongsToDiscipline: record.belongsToDiscipline,
          belongsToGroup: record.belongsToGroup,
        });
        if (!catalogue) {
          const discipline = await Disciplines.findOne({
            disciplineId: record.belongsToDiscipline,
          });
          if (discipline) {
            const disciplineCatalogue = await Catalogues.create({
              catalogueName: discipline.disciplineName,
              belongsToGroup: record.belongsToGroup,
              belongsToDiscipline: discipline.disciplineId,
              belongsToCatalogueId: null,
            });

            const homework = await Catalogues.create({
              catalogueName: "ДЗ",
              belongsToDiscipline: record.belongsToDiscipline,
              belongsToCatalogueId: disciplineCatalogue.catalogueId,
            });

            await Catalogues.create({
              catalogueName: record.topic.name,
              belongsToCatalogueId: homework.catalogueId,
              belongsToDiscipline: record.belongsToDiscipline,
            });

            const materials = await Catalogues.create({
              catalogueName: "Материалы",
              belongsToDiscipline: record.belongsToDiscipline,
              belongsToCatalogueId: disciplineCatalogue.catalogueId,
            });

            await Catalogues.create({
              catalogueName: record.topic.name,
              belongsToDiscipline: record.belongsToDiscipline,
              belongsToCatalogueId: materials.catalogueId,
            });
          }
        } else if (catalogue) {
          const homework = await Catalogues.findOne({
            catalogueName: "ДЗ",
            belongsToDiscipline: record.belongsToDiscipline,
            belongsToCatalogueId: catalogue.catalogueId,
          });
          await Catalogues.create({
            catalogueName: record.topic.name,
            belongsToCatalogueId: homework.catalogueId,
            belongsToDiscipline: record.belongsToDiscipline,
          });
          const materials = await Catalogues.findOne({
            catalogueName: "Материалы",
            belongsToDiscipline: record.belongsToDiscipline,
            belongsToCatalogueId: catalogue.catalogueId,
          });

          await Catalogues.create({
            catalogueName: record.topic.name,
            belongsToDiscipline: record.belongsToDiscipline,
            belongsToCatalogueId: materials.catalogueId,
          });
        }

        return res.created({ eventId: record.eventId });
      }

      return res.badRequest({
        missingProps: "event",
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
      const { success: valid, reason: checks } = await Events.validateList(
        req,
        query
      );
      if (!valid)
        return res.badRequest({
          details: checks,
          marker: locale.requestValidationFailed,
        });

      const { success, reason } = await Events.fetch(query);
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
        const { success: valid, reason: checks } = await Events.validateUpdate(
          req,
          filter,
          props
        );
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        if (props.relatedMaterials) {
          const event = await Events.findOne({ eventId: filter.eventId });
          const catalogueMaterials = await Catalogues.findOne({
            belongsToDiscipline: event.belongsToDiscipline,
            catalogueName: "Материалы",
          });

          const catalogue = await Catalogues.findOne({
            belongsToDiscipline: event.belongsToDiscipline,
            belongsToCatalogueId: catalogueMaterials.catalogueId,
            catalogueName: event.topic.name,
          });

          for (let materials of props.relatedMaterials) {
            await Catalogues.create({
              catalogueName: materials.catalogueName,
              type: materials.type,
              url: materials.url,
              size: materials.size,
              belongsToCatalogueId: catalogue.catalogueId,
            });
          }
        }
        const { success, reason } = await Events.fillIn(filter, props);
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
      const { eventId } = req.params;

      if (eventId) {
        const { success: valid, reason: checks } = await Events.validateDestroy(
          req,
          eventId
        );
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const result = await Events.destroy({ eventId });
        if (!result.length)
          return res.badRequest({ marker: locale.noRecordsFound });

        return res.ok(true, { marker: locale.resourceHasBeenRemoved });
      }

      return res.badRequest({
        missingProps: ["eventId"],
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },
};
