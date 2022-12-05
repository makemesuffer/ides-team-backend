const fs = require('fs')
const archiver = require('archiver')

const pack = require(`${__dirname}/../package.json`)

const { version } = pack


// clean up
fs.readdirSync(`${__dirname}/builds/`).forEach((file) => {
    fs.unlinkSync(`${__dirname}/builds/${file}`)
})

// create a file to stream archive data to
const output = fs.createWriteStream(`${__dirname}/builds/v_${version}.zip`)
const archive = archiver('zip', { zlib: { level: 9 } })

// listen for all archive data to be written
// 'close' event is fired only when a file descriptor is involved
output.on('close', () => {
    console.log(`${archive.pointer()} total bytes, ${version} archive ready`)
})

// This event is fired when the data source is drained no matter what was the data source.
// It is not part of this library but rather from the NodeJS Stream API.
// @see: https://nodejs.org/api/stream.html#stream_event_end
output.on('end', () => {
    console.log('Data has been drained')
})

// good practice to catch warnings (ie stat failures and other non-blocking errors)
archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
        // log warning
        console.log(err.message)
    } else {
        // throw error
        throw err
    }
})

// good practice to catch this error explicitly
archive.on('error', (err) => {
    throw err
})

// pipe archive data to the file
archive.pipe(output)

archive.file(__dirname + '/../.babelrc', { name: '.babelrc' })
archive.file(__dirname + '/../.sailsrc', { name: '.sailsrc' })
archive.file(__dirname + '/../.npmrc', { name: '.npmrc' })

archive.file(__dirname + '/../app.js', { name: 'app.js' })
archive.file(__dirname + '/../package.json', { name: 'package.json' })
archive.file(__dirname + '/../Procfile', { name: 'Procfile' })

archive.directory(__dirname + '/../views/', 'views')
archive.directory(__dirname + '/../config/', 'config')
archive.directory(__dirname + '/../api/', 'api')
archive.directory(__dirname + '/../.ebextensions/', '.ebextensions')


// finalize the archive (ie we are done appending files but streams have to finish yet)
// 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
archive.finalize()
