const fs = require('fs')

const mongoUrl = (process.env.MONGO_URL ||
    fs.readFileSync('./certs/mongoStd', 'utf8'))
    .replace(/(aMark)|(cMark)|(qMark)/g, (st, aMark, cMark) => {
    if (aMark) return '&'
    if (cMark) return ','
    return '?'
})

module.exports.connections = {

    mongoDev: {
        adapter: 'sails-mongo',
        url: mongoUrl
    },

    mongoTest: {
        adapter: 'sails-mongo',
        url: mongoUrl
    },

    mongoStage: {
        adapter: 'sails-mongo',
        url: mongoUrl
    },

    mongoProd: {
        adapter: 'sails-mongo',
        url: mongoUrl
    },

}

