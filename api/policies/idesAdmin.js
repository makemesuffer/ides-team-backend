const { Constants } = sails.config.globals

module.exports = (req, res, next) => {
    const locale = Locale('markers')

    const { authenticated } = req.session

    if (
        authenticated && authenticated.profileType === Constants.idesAdmin
    ) return next()

    return res.forbidden(locale.youAreNotPermittedToPerformThisAction)
}
