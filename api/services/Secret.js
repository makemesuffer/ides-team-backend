const fs = require('fs')
const crypto = require('crypto')
const { NODE_ENV, SECRET_PASSWORD } = process.env

const algorithm = 'aes-256-ctr'
const password = fs.readFileSync('./certs/secretPassword', 'utf8')

function encrypt(text) {
    const cipher = crypto.createCipher(algorithm, password)
    let crypted = cipher.update(text, 'utf8', 'hex')
    crypted += cipher.final('hex')
    return crypted
}


function decrypt(text) {
    try {
        const decipher = crypto.createDecipher(algorithm, password)
        let dec = decipher.update(text, 'hex', 'utf8')
        dec += decipher.final('utf8')
        return dec
    } catch (e) {
        return 'failed to decrypt'
    }
}


module.exports = {
    encrypt,
    decrypt
}
