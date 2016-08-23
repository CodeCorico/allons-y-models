'use strict';

module.exports = function($allonsy, $env, $done) {

  var path = require('path'),
      databasesFiles = $allonsy.findInFeaturesSync('*-database.json'),
      databasesConfigs = [],
      prompts = [],
      defaultPorts = {
        postgresql: 5432,
        mysql: 3306,
        mongo: 27017,
        redis: 6379
      };

  function _default(name, value) {
    return typeof $env[name] != 'undefined' ? $env[name] : value;
  }

  $allonsy.log('allons-y-models', 'database-start', {
    files: databasesFiles
  });

  databasesFiles.forEach(function(file) {
    var configs = require(path.resolve(file));

    $allonsy.log('allons-y-models', 'database-config-load:' + file);

    if (!configs || !configs.databases || typeof configs.databases != 'object' || !configs.databases.length) {
      $allonsy.logError('allons-y-models', 'database-config-error', {
        error: new Error('Databases configuration missing: ' + file),
        configs: configs
      });

      return;
    }

    configs.databases.forEach(function(config) {
      var prefixEnv = 'DB_' + config.name + '_';

      databasesConfigs.push(config);

      prompts = prompts.concat([{
        type: 'input',
        name: prefixEnv + 'HOST',
        message: config.name + '\'s host:',
        default: _default(prefixEnv + 'HOST', 'localhost')
      }, {
        type: 'input',
        name: prefixEnv + 'PORT',
        message: config.name + '\'s port:',
        default: _default(prefixEnv + 'PORT', defaultPorts[config.type])
      }, {
        type: 'input',
        name: prefixEnv + 'NAME',
        message: config.name + '\'s database name:',
        default: _default(prefixEnv + 'NAME', '')
      }, {
        type: 'input',
        name: prefixEnv + 'USER',
        message: config.name + '\'s database user:',
        default: _default(prefixEnv + 'USER', '')
      }, {
        type: 'input',
        name: prefixEnv + 'PASSWORD',
        message: config.name + '\'s database password:',
        default: _default(prefixEnv + 'PASSWORD', '')
      }, {
        type: 'confirm',
        name: prefixEnv + 'POOL',
        message: 'Enable pool connections for "' + config.name + '":',
        default: _default(prefixEnv + 'POOL', false)
      }, {
        type: 'input',
        name: prefixEnv + 'POOL_LIMIT',
        message: config.name + '\'s pool connections limit:',
        default: _default(prefixEnv + 'POOL_LIMIT', 20),
        when: prefixEnv + 'POOL=true'
      }]);
    });
  });

  if (databasesConfigs.length) {
    $allonsy.outputInfo([
      '\n  Configure your ',
      databasesConfigs.length + ' ' + (databasesConfigs.length > 1 ? 'databases' : 'database'),
      '\'s ' + (databasesConfigs.length > 1 ? 'connections' : 'connection') + ':\n\n'
    ].join(''));

    databasesConfigs.forEach(function(config) {
      $allonsy.outputWarning('  ' + config.name + ' (' + config.type + '):\n');
      $allonsy.outputInfo('    ' + (config.description || 'no description') + '\n\n');
    });
  }

  $done(prompts);
};
