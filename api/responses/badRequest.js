module.exports = function badRequest(reason) {
    let res = this.res
    res.status(400)

    let data = { success: false }

    if (reason) data.reason = reason
    if (reason instanceof Error) data.reason = reason.message

    sails.log.verbose('Sending 400 ("Bad Request") response: \n', data)
    return res.jsonx(data)
}