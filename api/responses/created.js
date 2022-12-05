module.exports = function created(reason) {
    let res = this.res
    res.status(201);

    let data = { success: true }
    if (reason) data.reason = reason

    sails.log.verbose('Sending 201 ("Created") response: \n', data)
    return res.jsonx(data)
}