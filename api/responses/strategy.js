module.exports = function strategy(success = true, reason) {
    let res = this.res
    res.status(204)

    let data = { success }
    if (reason) data.reason = reason

    sails.log.verbose('Sending 204 ("Strategy") response: \n', data)
    return res.jsonx(data)
}