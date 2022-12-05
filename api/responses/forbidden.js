module.exports = function forbidden(reason) {
    let res = this.res
    res.status(403)

    let data = { success: false }
    if (reason) data.reason = reason

    sails.log.verbose('Sending 403 ("Forbidden") response: \n', data)
    return res.jsonx(data)
}