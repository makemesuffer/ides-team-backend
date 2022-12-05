module.exports = {
  create: async (req, res) => {
    try {
      const locale = Locale("markers");
      const { assignment } = req.body;

      if (assignment) {
        const {
          success: valid,
          reason: checks,
        } = await Assignments.validateCreate(req, assignment);
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const record = await Assignments.create(assignment);
        return res.created({ assignmentId: record.assignmentId });
      }

      return res.badRequest({
        missingProps: "assignment",
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
      const { success: valid, reason: checks } = await Assignments.validateList(
        req,
        query
      );
      if (!valid)
        return res.badRequest({
          details: checks,
          marker: locale.requestValidationFailed,
        });

      const { success, reason } = await Assignments.fetch(query);

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
        } = await Assignments.validateUpdate(req, filter, props);
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const { success, reason } = await Assignments.fillIn(filter, props);
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
      const { assignmentId } = req.params;

      if (assignmentId) {
        const {
          success: valid,
          reason: checks,
        } = await Assignments.validateDestroy(req, assignmentId);
        if (!valid)
          return res.badRequest({
            details: checks,
            marker: locale.requestValidationFailed,
          });

        const result = await Assignments.destroy({ assignmentId });
        if (!result.length)
          return res.badRequest({ marker: locale.noRecordsFound });

        return res.ok(true, { marker: locale.resourceHasBeenRemoved });
      }

      return res.badRequest({
        missingProps: ["assignmentId"],
        marker: locale.requestMissingRequiredProps,
      });
    } catch (e) {
      return res.error(e);
    }
  },
};
