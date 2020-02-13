 /**
 * @file 
 *
 * Search module router
 *
 */

'use strict';

var Search = require('../search/controller');
var Helper = require('../libs/helper');

module.exports = function (app) {
	app.use(function (req, res, next) {
      Helper.sanitizeHttpParamsObject(req.query);
      next()
    })
    
    app.route('/search')
        .get(Search.search);
};