module.exports = {

    create: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { invite } = req.body

            if (invite) {
                const { success: valid, reason: checks } = await Invites.validateCreate(req, invite)
                if (!valid) return res.badRequest({ details: checks, marker: locale.requestValidationFailed })

                const record = await Invites.create(invite)
                return res.created({ inviteId: record.inviteId })
            }

            return res.badRequest({ missingProps: 'invite', marker: locale.requestMissingRequiredProps })
        } catch (e) {
            return res.error(e)
        }
    },

    list: async (req, res) => {
        try {
            const locale = Locale('markers')

            const query = JSON.parse(req.params.query || '{"filter":{}}')
            const { success: valid, reason: checks } = await Invites.validateList(req, query)
            if (!valid) return res.badRequest({ details: checks, marker: locale.requestValidationFailed })

            const { success, reason } = await Invites.fetch(query)
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
                const { success: valid, reason: checks } = await Invites.validateUpdate(req, filter, props)
                if (!valid) return res.badRequest({ details: checks, marker: locale.requestValidationFailed })

                const { success, reason } = await Invites.fillIn(filter, props)
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
            const { inviteId } = req.params

            if (inviteId) {
                const { success: valid, reason: checks } = await Invites.validateDestroy(req, inviteId)
                if (!valid) return res.badRequest({ details: checks, marker: locale.requestValidationFailed })

                const result = await Invites.destroy({ inviteId })
                if (!result.length) return res.badRequest({ marker: locale.noRecordsFound })

                return res.ok(true, { marker: locale.resourceHasBeenRemoved })
            }

            return res.badRequest({ missingProps: ['inviteId'], marker: locale.requestMissingRequiredProps })
        } catch (e) {
            return res.error(e)
        }
    }

}