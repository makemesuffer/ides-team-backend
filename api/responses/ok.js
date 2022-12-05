module.exports = function ok(success = true, reason) {
    let res = this.res
    res.status(200)

    let data = { success }
    if (reason) data.reason = reason

    sails.log.verbose('Sending 200 ("Ok") response: \n', data)
    return res.jsonx(data)
}