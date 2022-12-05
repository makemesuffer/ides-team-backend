const { Constants } = sails.config.globals

module.exports = (req, res, next) => {
    const locale = Locale('markers')

    const { authenticated } = req.session
    if (
        authenticated && authenticated.profileType === Constants.idesAdmin ||
        authenticated && authenticated.profileType === Constants.schoolAdmin
    ) return next()

    return res.forbidden(locale.youAreNotPermittedToPerformThisAction)
}
