module.exports = function notFound(reason) {
    let res = this.res
    res.status(404);

    let data = { success: false }
    if (reason) data.reason = reason

    sails.log.verbose('Sending 404 ("Not Found") response: \n', data)
    return res.jsonx(data)
}