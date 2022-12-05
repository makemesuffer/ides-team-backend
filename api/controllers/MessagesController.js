const { Constants } = sails.config.globals

module.exports = {

    sendEmail: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { message = {} } = req.body

            const props = ['type', 'content']
            const missingProps = props.filter(item => !(item in message))

            if (message && !missingProps.length) {
                const { institutionId } = req.session.authenticated

                if (message.type !== Constants.email) return res.badRequest({ 
                    details: { type: 'wrong message type' }, marker: locale.requestValidationFailed 
                })

                const { success: valid, reason: checks } = await Messages.validateCreate(req, { ...message, institutionId })
                if (!valid) return res.badRequest({ details: checks, marker: locale.requestValidationFailed })

                const record = await Messages.create({ ...message, institutionId })
                return res.created({ messageId: record.messageId })
            }

            return res.badRequest({ missingProps, marker: locale.requestMissingRequiredProps })
        } catch (e) {
            return res.error(e)
        }
    }

}