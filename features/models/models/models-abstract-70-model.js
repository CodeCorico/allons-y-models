'use strict';

module.exports = function() {
  DependencyInjection.model('$AbstractModel', function($allonsy) {

    return function AbstractModel(name, nodeConstructor) {

      var path = require('path'),
          Waterline = require('waterline'),
          _this = this,
          $DatabaseService = DependencyInjection.injector.model.get('$DatabaseService'),
          config = DependencyInjection.injector.model.invoke(null, nodeConstructor),
          bootstrapFiles = $allonsy.findInFeaturesSync('models/*-abstract-model-bootstrap.js');

      if (!config || !config.identity) {
        $allonsy.logError('allons-y-models', 'abstract-model-error:identity', {
          error: new Error('Missing "identity" property in schema')
        });

        return;
      }

      bootstrapFiles.forEach(function(file) {
        var bootstrapModule = require(path.resolve(file));

        config = DependencyInjection.injector.model.invoke(null, bootstrapModule, {
          controller: {
            $AbstractModel: function() {
              return _this;
            },

            $name: function() {
              return name;
            },

            $config: function() {
              return config;
            }
          }
        });
      });

      var model = Waterline.Collection.extend(config);

      $DatabaseService.loadModel(name, config.identity, config.connection, model);

      return model;
    };
  });
};
