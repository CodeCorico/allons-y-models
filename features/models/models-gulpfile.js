'use strict';

module.exports = function($allonsy, $gulp) {

  var path = require('path'),
      through = require('through2'),
      sourcemaps = require('gulp-sourcemaps'),
      uglify = require('gulp-uglify'),
      rename = require('gulp-rename'),
      src = $allonsy.globPatterns('models/*-@(factory|factory-front|service|service-front).js');

  $gulp.task('models', function(done) {

    var files = [];

    $gulp
      .src(src)
      .pipe(through.obj(function(file, encoding, throughDone) {
        files.push(file);

        throughDone();
      }, function(throughDone) {
        var transform = this;

        files.forEach(function(file) {
          if (file.path.indexOf('-front.js') < 0) {
            file.contents = new Buffer('(' + require(file.path).toString()  + ')();\n');

            delete require.cache[file.path];
          }

          var inModules = file.path.indexOf('node_modules') > -1,
              fileSplitted = file.path.split(path.sep),
              fileName = fileSplitted.pop();

          fileSplitted.pop();

          var fileFeature = fileSplitted.pop();

          if (inModules) {
            fileSplitted.pop();
            fileSplitted.pop();
          }

          file.path = path.resolve(fileSplitted.join(path.sep) + '/' + fileFeature + '/' + fileName);

          transform.push(file);
        });

        throughDone();

        transform.emit('end');
      }))
      .pipe($gulp.dist())
      .pipe(sourcemaps.init())
      .pipe(uglify())
      .pipe(rename({
        extname: '.min.js'
      }))
      .pipe(sourcemaps.write('./'))
      .pipe($gulp.dist())
      .on('end', done);
  });

  return {
    tasks: 'models',
    watch: src
  };
};
