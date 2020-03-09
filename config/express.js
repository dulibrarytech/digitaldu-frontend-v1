'use strict';

var http = require('http'),
    express = require('express'),
    helmet = require('helmet'),
    bodyParser = require('body-parser'),
    config = require('./config.js');

module.exports = function () {

    var app = express(),
        server = http.createServer(app);

    if (process.env.NODE_ENV === 'development') {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
    } else if (process.env.NODE_ENV === 'production') {
        app.use(compress());
    }

    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());

    app.use(helmet());
    app.use(helmet.noCache());
    app.use(helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'", config.IIIFServerUrl, config.repositoryUrl.replace("http://", "").replace(":8080", ""), 'specialcollections.du.edu', 'www.google-analytics.com', 'cdnapisec.kaltura.com', 'data:', 'blob:', 'www.du.edu', 'fonts.gstatic.com', 'use.fontawesome.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'maxcdn.bootstrapcdn.com', 'use.fontawesome.com', 'vjs.zencdn.net', 'code.jquery.com', 'fonts.googleapis.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'www.google-analytics.com', 'vjs.zencdn.net', 'use.fontawesome.com', 'code.jquery.com'],
        fontSrc: ["'self'", 'data:', 'fonts.gstatic.com', 'use.fontawesome.com']
      }
    }))
    app.disable('x-powered-by');

    app.use(express.static('./public'));
    app.set('views', './views');
    app.set('view engine', 'ejs');

    // Add modules here
    require('../discovery/routes.js')(app);
    require('../search/routes.js')(app);
    require('../specialcollections/routes.js')(app);
    require('../test/routes.js')(app);
    
    // Express dependencies
    require('express-template-cache');

    // Root route to landing page
    app.route('/')
        .get(function(req, res) {
            res.redirect(config.rootUrl);
    });

    return server;
};