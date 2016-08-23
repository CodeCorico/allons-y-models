'use strict';

module.exports = function($allonsy, $gulp) {

  var path = require('path'),
      fs = require('fs-extra'),
      sourcemaps = require('gulp-sourcemaps'),
      uglify = require('gulp-uglify'),
      rename = require('gulp-rename'),
      publicPath = path.resolve('public'),
      filesPattern = '*-@(factory|service).js';

  $gulp.task('models', function(done) {

    var files = $allonsy.findInFeaturesSync(filesPattern);

    files.forEach(function(file) {
      file = path.resolve(file);

      delete require.cache[file];

      var filePathArray = file.split(path.sep),
          filename = filePathArray.pop(),
          destPath = path.join(publicPath, filePathArray.pop() ? filePathArray.pop() : null);

      fs.ensureDirSync(destPath);

      fs.writeFileSync(
        path.join(destPath, filename),
        '(' + require(file).toString() + ')();\n'
      );
    });

    $gulp.src(path.join(publicPath, '**', filesPattern))
      .pipe(sourcemaps.init())
      .pipe(uglify())
      .pipe(rename({
        extname: '.min.js'
      }))
      .pipe(sourcemaps.write('./'))
      .pipe($gulp.dest(function(file) {
        var filePath = file.path.split(path.sep);
        filePath.pop();
        filePath.pop();

        return filePath.join(path.sep);
      }))
      .on('end', done);
  });

  return {
    task: 'models',
    watch: './features/**/models/' + filesPattern
  };
};
