'use strict';

var path = require('path');

require(path.resolve(__dirname, 'models-database-service-back.js'))();
require(path.resolve(__dirname, 'models-abstract-service.js'))();

module.exports = function($DatabaseService, $done) {

  $DatabaseService.initModels($done);

};
