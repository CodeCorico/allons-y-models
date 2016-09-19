module.exports = function() {
  'use strict';

  DependencyInjection.service('$DatabaseService', function($allonsy) {

    return new (function DatabaseService() {

      var TYPES = {
            postgresql: 'sails-postgresql',
            mysql: 'sails-mysql',
            mongo: 'sails-mongo',
            redis: 'sails-redis'
          },

          path = require('path'),
          async = require('async'),
          Waterline = require('waterline'),
          _databaseFiles = $allonsy.findInFeaturesSync('*-database.json'),
          _modelsFiles = $allonsy.findInFeaturesSync('models/*-model.js'),
          _initFiles = $allonsy.findInFeaturesSync('models/*-after-init.js'),
          _waterline = null,
          _models = [],
          _connections = [],
          _modelsSchemas = {},
          _modelsConnections = {};

      this.models = function() {
        return _models;
      };

      this.connections = function() {
        return _connections;
      };

      this.instance = function() {
        return _waterline;
      };

      this.loadModel = function(name, identity, connection, model) {
        _modelsSchemas[identity] = name;
        _modelsConnections[identity] = connection;
        _waterline.loadCollection(model);
      };

      this.initModels = function(createIndexes, callback) {
        $allonsy.log('allons-y-models', 'models-init-start');

        var waterlineConfig = {
          adapters: {},
          connections: {}
        };

        _databaseFiles.forEach(function(file) {
          $allonsy.log('allons-y-models', 'models-init-load:' + file);

          var configs = require(path.resolve(file));

          if (!configs || !configs.databases || typeof configs.databases != 'object' || !configs.databases.length) {
            $allonsy.outputWarning('allons-y-models', 'models-init-load-error:' + file, {
              error: new Error('Databases configuration missing: ' + file),
              configs: configs
            });

            return;
          }

          configs.databases.forEach(function(config) {
            $allonsy.log('allons-y-models', 'models-init-register:' + config.name);

            if (config.type && TYPES[config.type]) {
              config.adapter = TYPES[config.type];
            }

            if (!config.adapter || !config.name) {
              $allonsy.outputWarning('allons-y-models', 'models-init-register-error:' + file, {
                error: new Error('Impossible to register the database: ' + file),
                config: config
              });

              return;
            }

            var prefixEnv = 'DB_' + config.name + '_';

            waterlineConfig.adapters[config.adapter] = require(config.adapter);
            waterlineConfig.connections[config.name] = {
              adapter: config.adapter,
              host: process.env[prefixEnv + 'HOST'] || null,
              port: process.env[prefixEnv + 'PORT'] || null,
              database: process.env[prefixEnv + 'NAME'] || null,
              user: process.env[prefixEnv + 'USER'] || null,
              password: process.env[prefixEnv + 'PASSWORD'] || null,

              // mysql
              charset: process.env[prefixEnv + 'CHARSET'] || null,
              collation: process.env[prefixEnv + 'COLLATION'] || null,

              // optionnal
              pool: process.env[prefixEnv + 'POOL'] && process.env[prefixEnv + 'POOL'] == 'true' ? true : false,
              poolSize:
                process.env[prefixEnv + 'POOL'] && process.env[prefixEnv + 'POOL'] == 'true' &&
                process.env[prefixEnv + 'POOL_LIMIT'] || null
            };
          });
        });

        _waterline = new Waterline();

        _modelsFiles.forEach(function(file) {
          $allonsy.log('allons-y-models', 'models-model-load:' + file);

          var modelName = require(path.resolve(file))();

          if (typeof modelName == 'string') {
            $allonsy.log('allons-y-models', 'models-model-register:' + modelName);

            DependencyInjection.injector.model.get(modelName);
          }
        });

        $allonsy.log('allons-y-models', 'models-waterline-init');

        _waterline.initialize(waterlineConfig, function(err, models) {
          _models = models.collections;
          _connections = models.connections;

          var identities = Object.keys(_models);

          identities.forEach(function(identity) {
            DependencyInjection.model(_modelsSchemas[identity], function() {
              return _models[identity];
            }, true);
          });

          async.eachSeries(identities, function(identity, nextModel) {
            var model = DependencyInjection.injector.model.get(_modelsSchemas[identity]);

            async.waterfall([function(callback) {
              if (
                !createIndexes ||
                !model._attributes ||
                _connections[_modelsConnections[identity]].config.adapter != 'sails-mongo'
              ) {
                return callback();
              }

              model.native(function(err, collection) {
                if (err) {
                  return callback();
                }

                collection.indexes(function(err, indexes) {
                  if (err && err.name == 'MongoError' && err.errmsg == 'no collection') {
                    indexes = [];
                  }
                  else if (err) {
                    return callback();
                  }

                  indexes = indexes ? indexes.map(function(index) {
                    return index.name;
                  }) : [];

                  var indexesToCreate = [];

                  Object.keys(model._attributes).forEach(function(attributeName) {
                    var attribute = model._attributes[attributeName];

                    if (attributeName == 'id' || !attribute || typeof attribute != 'object' || !attribute.index) {
                      return;
                    }

                    var indexName = attribute.indexName || attributeName + '_1';

                    if (indexes.indexOf(indexName) < 0) {
                      var key = {};
                      key[attributeName] = 1;

                      if (attribute.index == 'text') {
                        var indexAttributes = {};

                        attribute.indexAttributes.forEach(function(attr) {
                          indexAttributes[attr] = 'text';
                        });

                        indexesToCreate.push([indexAttributes, {
                          v: 1,
                          name: indexName,
                          weights: attribute.indexWeights
                        }]);
                      }
                      else {
                        indexesToCreate.push({
                          v: 1,
                          key: key,
                          name: indexName,
                          sparse: true
                        });
                      }

                      $allonsy.log('allons-y-models', 'models-index-create:' + (model.tableName || model.identity) + ':' + indexName + ':' + identity);

                      $allonsy.outputInfo('  Create index: ' + (model.tableName || model.identity) + '.' + indexName + ' (' + identity + ')');
                    }
                  });

                  var indexesToCreateGrouped = [];

                  async.eachSeries(indexesToCreate, function(indexToCreate, nextIndex) {
                    if (!Array.isArray(indexToCreate)) {
                      indexesToCreateGrouped.push(indexToCreate);

                      return nextIndex();
                    }

                    collection.ensureIndex(indexToCreate[0], indexToCreate[1], function() {
                      nextIndex();
                    });

                  }, function() {
                    if (!indexesToCreateGrouped.length) {
                      return callback();
                    }

                    collection.createIndexes(indexesToCreateGrouped, function() {
                      callback();
                    });
                  });
                });
              });
            }, function() {
              if (model.beforeInit) {
                model.beforeInit();
              }

              if (model.init) {
                model.init();
              }

              nextModel();
            }]);
          }, function() {

            async.eachSeries(_initFiles, function(initFile, nextInitFile) {
              var initModule = require(path.resolve(initFile));

              DependencyInjection.injector.service.invoke(null, initModule, {
                service: {
                  $done: function() {
                    return nextInitFile;
                  }
                }
              });

            }, function() {

              if (callback) {
                callback();
              }
            });

          });

        });
      };

    })();

  });

};
