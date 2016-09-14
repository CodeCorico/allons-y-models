'use strict';

module.exports = function($processIndex, $done) {
  var path = require('path');

  require(path.resolve(__dirname, 'models/models-database-service-back.js'))();
  require(path.resolve(__dirname, 'models/models-abstract-service.js'))();

  var $DatabaseService = DependencyInjection.injector.controller.get('$DatabaseService');

  $DatabaseService.initModels($processIndex === 0, $done);
};
