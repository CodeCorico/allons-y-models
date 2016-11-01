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

      if (config.when) {
        var whens = typeof config.when == 'string' ? [config.when] : config.when;

        whens = whens
          .map(function(when) {
            when = when.split('=');

            if (when.length > 1) {
              when[0] = when[0].trim();
              when[1] = when[1].trim();

              when[1] = when[1] == 'true' ? true : when[1];
              when[1] = when[1] == 'false' ? false : when[1];

              if (when[0]) {
                return when;
              }
            }

            return null;
          })
          .filter(function(when) {
            return !!when;
          });

        for (var i = 0; i < whens.length; i++) {
          var when = whens[i];

          if (when[1] != $env[when[0]]) {
            return;
          }
        }
      }

      databasesConfigs.push(config);

      function banner() {
        $allonsy.outputWarning('\n  ' + config.name + ' (' + config.type + '):\n');
        $allonsy.outputInfo('    ' + (config.description || 'no description') + '\n');
      }

      function noPrevious(env) {
        return !env[prefixEnv + 'USE_PREVIOUS'];
      }

      var bannerDisplayed = false,
          previousEnv = null;

      if (prompts.length) {
        previousEnv = prompts[prompts.length - 1].name
          .replace('POOL_LIMIT', '')
          .replace('POOL', '');

        prompts.push({
          type: 'confirm',
          name: prefixEnv + 'USE_PREVIOUS',
          message: 'Use the same database configuration as above:',
          default: _default(prefixEnv + 'USE_PREVIOUS', true),
          when: function() {
            banner();

            return true;
          }
        });

        bannerDisplayed = true;
      }

      prompts = prompts.concat([{
        type: 'input',
        name: prefixEnv + 'HOST',
        message: 'Host:',
        default: _default(prefixEnv + 'HOST', 'localhost'),
        when: function(env) {
          if (!bannerDisplayed) {
            banner();
          }

          var usePrevious = !noPrevious(env);

          if (usePrevious) {
            ['HOST', 'PORT', 'NAME', 'USER', 'PASSWORD', 'POOL', 'POOL_LIMIT'].forEach(function(envName) {
              env[prefixEnv + envName] = env[previousEnv + envName];
            });
          }

          return !usePrevious;
        }
      }, {
        type: 'input',
        name: prefixEnv + 'PORT',
        message: 'Port:',
        default: _default(prefixEnv + 'PORT', defaultPorts[config.type]),
        when: function(env) {
          return noPrevious(env);
        }
      }, {
        type: 'input',
        name: prefixEnv + 'NAME',
        message: 'Database name:',
        default: _default(prefixEnv + 'NAME', ''),
        when: function(env) {
          return noPrevious(env);
        }
      }, {
        type: 'input',
        name: prefixEnv + 'USER',
        message: 'Database user:',
        default: _default(prefixEnv + 'USER', ''),
        when: function(env) {
          return noPrevious(env);
        }
      }, {
        type: 'input',
        name: prefixEnv + 'PASSWORD',
        message: 'Database password:',
        default: _default(prefixEnv + 'PASSWORD', ''),
        when: function(env) {
          return noPrevious(env);
        }
      }, {
        type: 'confirm',
        name: prefixEnv + 'POOL',
        message: 'Enable pool connections:',
        default: _default(prefixEnv + 'POOL', false),
        when: function(env) {
          return noPrevious(env);
        }
      }, {
        type: 'input',
        name: prefixEnv + 'POOL_LIMIT',
        message: 'Pool connections limit:',
        default: _default(prefixEnv + 'POOL_LIMIT', 20),
        when: function(env) {
          return noPrevious(env) && env[prefixEnv + 'POOL'];
        }
      }]);
    });
  });

  if (databasesConfigs.length) {
    $allonsy.outputInfo([
      '\n  Configure your ',
      databasesConfigs.length + ' ' + (databasesConfigs.length > 1 ? 'databases' : 'database'),
      '\'s ' + (databasesConfigs.length > 1 ? 'connections' : 'connection') + ':'
    ].join(''));
  }

  $done(prompts);
};
