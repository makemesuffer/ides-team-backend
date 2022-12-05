const { Constants } = sails.config.globals

module.exports = (req, res, next) => {
    const locale = Locale('markers')

    const { path } = req.route
    const { authenticated } = req.session
    console.log(authenticated)

    if (
        authenticated && authenticated.profileType === Constants.idesAdmin
    ) return next()

    // cut off slug
    let route = path.slice(1, path.length)
    if (route.indexOf('/') > -1) {
        const index = route.indexOf('/')
        route = route.slice(0, index)
    }

    const permissions = authenticated.permissions[route]

    if (!permissions) {
        sails.log.info(route)
        sails.log.info(locale.permissionsNotSet)
        return res.forbidden(locale.youAreNotPermittedToPerformThisAction)
    }

    return next()
}
