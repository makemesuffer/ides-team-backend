module.exports = function error(e = {}, message) {
    sails.log.error(e.message)
    // call to Sentry

    let res = this.res
    res.status(500)

    data = { success: false, reason: message || e.message }

    sails.log.verbose('Sending 500 ("Server Error") response: \n', data)
    return res.jsonx(data)
}