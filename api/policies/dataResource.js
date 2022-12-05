module.exports = (req, res, next) => {
    const locale = Locale('markers')

    const { accept } = req.headers
    if (accept && accept.indexOf('json') > -1) return next()
    if (req.isSocket) return next()

    return res.forbidden(locale.youAreNotPermittedToPerformThisAction)
}
