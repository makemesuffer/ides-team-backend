module.exports = {

    update: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { props } = req.body
            const { accountId } = req.session.authenticated

            if (props) {
                const { success: valid, reason: checks } = await Accounts.validateUpdate(req, { accountId }, props)
                if (!valid) return res.badRequest({ details: checks, marker: locale.requestValidationFailed })

                const { success, reason } = await Accounts.fillIn({ accountId }, props)
                if (!success) return res.badRequest(reason)

                req.session.authenticated = reason
                return res.ok(true, reason)
            }

            return res.badRequest({ missingProps: ['props'], marker: locale.requestMissingRequiredProps })
        } catch (e) {
            return res.error(e)
        }
    },

    requestPasswordResetFromConsole: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { requestPasswordReset = {} } = req.body
            const { email } = req.session.authenticated

            const props = ['currentPassword', 'newPassword']
            const missingProps = props.filter(item => !(item in requestPasswordReset))

            if (requestPasswordReset && !missingProps.length) {
                const { currentPassword, newPassword } = requestPasswordReset

                if ((await Accounts.checkInWithPassword(email, currentPassword)).success) {
                    await Accounts.update({ email }, { password: Secret.encrypt(newPassword) })
                    return res.ok(true, { marker: locale.passwordUpdated })
                }

                return res.badRequest({ marker: locale.wrongPassword })
            }

            return res.badRequest({ missingProps, marker: locale.requestMissingRequiredProps })
        } catch (e) {
            return res.error(e)
        }
    }

}
