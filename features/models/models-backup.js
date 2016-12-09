'use strict';

module.exports = function($allonsy, $task, $done) {
  if (process.env.MODELS_BACKUP && process.env.MODELS_BACKUP == 'false') {
    return $done();
  }

  var path = require('path'),
      spawn = require('child_process').spawn,
      databaseFiles = $allonsy.findInFeaturesSync('*-database.json'),
      databases = {};

  databaseFiles.forEach(function(file) {
    var configs = require(path.resolve(file));

    configs.databases.forEach(function(config) {
      if (!config.type || config.type != 'mongo') {
        return;
      }

      var prefixEnv = 'DB_' + config.name + '_';

      databases[
        'mongodb://' + (
          process.env[prefixEnv + 'USER'] ?
            process.env[prefixEnv + 'USER'] + (
              process.env[prefixEnv + 'PASSWORD'] ? ':' + process.env[prefixEnv + 'PASSWORD'] : ''
            ) + '@' :
            ''
        ) + process.env[prefixEnv + 'HOST'] + (
          process.env[prefixEnv + 'PORT'] ? ':' + process.env[prefixEnv + 'PORT'] : ''
        ) +
        (process.env[prefixEnv + 'NAME'] ? '/' + process.env[prefixEnv + 'NAME'] : '')
      ] = {
        host: process.env[prefixEnv + 'HOST'],
        port: process.env[prefixEnv + 'PORT'],
        name: process.env[prefixEnv + 'NAME'],
        user: process.env[prefixEnv + 'USER'],
        password: process.env[prefixEnv + 'PASSWORD']
      };
    });
  });

  function _exportTask(database, $backupPath, $addDestination, $done) {
    var databasesPath = path.join($backupPath, 'databases'),
        spawnWith = {
          stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        },
        args = [
          '--host', database.host + ':' + (database.port || 27017),
          '--db', database.name,
          '--out', databasesPath
        ];

    if (process.platform === 'win32') {
      spawnWith.detached = true;
    }

    if (database.user) {
      args.push('--username');
      args.push(database.user);
      args.push('--password');
      args.push(database.password);
    }

    var dumpChild = spawn('mongodump', args, spawnWith);

    dumpChild.on('exit', function() {
      $addDestination(databasesPath);

      $done();
    });
  }

  Object.keys(databases).forEach(function(url) {
    var database = databases[url];

    $task(function($backupPath, $addDestination, $done) {
      _exportTask(database, $backupPath, $addDestination, $done);
    });
  });

  $done();
};
