module.exports = function (req, res, next) {
    const locale = Locale('markers')
    console.log('Received HTTP request ' + req.method + ' ' + req.path)
    if (req.session.authenticated) {
        return next()
    }

    return next()// res.forbidden(locale.youAreNotPermittedToPerformThisAction)
}
