'use strict';

var path = require('path');

require(path.resolve(__dirname, 'models/models-database-service-back.js'))();
require(path.resolve(__dirname, 'models/models-abstract-service.js'))();

module.exports = function($DatabaseService, $processIndex, $done) {

  $DatabaseService.initModels($processIndex === 0, $done);

};
