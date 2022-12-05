module.exports.http = {
    middleware: {
        order: [
            'cookieParser',
            'session',
            'bodyParser',
            'compress',
            'poweredBy',
            'router',
            'www',
            'favicon',
            'logRequest'
        ],

        logRequest: (function() {
            console.log('Initializing `foobar` (HTTP middleware)...');
            return function (req, res, next) {
                console.log('Received HTTP request: '+req.method+' '+req.path);
                return next();
            }
        })()
    }
}
