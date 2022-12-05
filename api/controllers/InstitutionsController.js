module.exports = {

    create: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { institution } = req.body

            if (institution) {
                const { success: valid, reason: checks } = await Institutions.validateCreate(req, institution)
                if (!valid) return res.badRequest({ details: checks, marker: locale.requestValidationFailed })

                const record = await Institutions.create(institution)
                return res.created({ institutionId: record.institutionId })
            }

            return res.badRequest({ missingProps: 'institution', marker: locale.requestMissingRequiredProps })
        } catch (e) {
            return res.error(e)
        }
    },

    list: async (req, res) => {
        try {
            const locale = Locale('markers')

            const query = JSON.parse(req.params.query || '{"filter":{}}')
            const { success: valid, reason: checks } = await Institutions.validateList(req, query)
            if (!valid) return res.badRequest({ details: checks, marker: locale.requestValidationFailed })

            const { success, reason } = await Institutions.fetch(query)
            if (!success) return res.badRequest(reason)

            return res.ok(true, reason)
        } catch (e) {
            return res.error(e)
        }
    },

    update: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { filter, props } = req.body

            const updateProps = ['filter', 'props']
            const missingProps = updateProps.filter(item => !(item in req.body))

            if (!missingProps.length) {
                const { success: valid, reason: checks } = await Institutions.validateUpdate(req, filter, props)
                if (!valid) return res.badRequest({ details: checks, marker: locale.requestValidationFailed })

                const { success, reason } = await Institutions.fillIn(filter, props)
                if (!success) return res.badRequest(reason)
                return res.ok(true, reason)
            }

            return res.badRequest({ missingProps, marker: locale.requestMissingRequiredProps })
        } catch (e) {
            return res.error(e)
        }
    },

    delete: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { institutionId } = req.params

            if (institutionId) {
                const { success: valid, reason: checks } = await Institutions.validateDestroy(req, institutionId)
                if (!valid) return res.badRequest({ details: checks, marker: locale.requestValidationFailed })

                const result = await Institutions.destroy({ institutionId })
                if (!result.length) return res.badRequest({ marker: locale.noRecordsFound })

                return res.ok(true, { marker: locale.resourceHasBeenRemoved })
            }

            return res.badRequest({ missingProps: ['institutionId'], marker: locale.requestMissingRequiredProps })
        } catch (e) {
            return res.error(e)
        }
    }

}