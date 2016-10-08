var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify')
var ngmin = require('gulp-ngmin');
var pump = require('pump');
var rename = require('gulp-rename');
var ngAnnotate = require('gulp-ng-annotate'); 
var sh = require('shelljs');


var paths = {
  js: ['ngWorkerAudioRecorder.js']
};

gulp.task('default', ['compress']);

gulp.task('compress', function (cb) {
  pump([
        gulp.src(paths.js),
        ngAnnotate(),
        ngmin({dynamic: false}),
        uglify({
          outSourceMap: false,
          mangle: true,//类型：Boolean 默认：true 是否修改变量名  
          compress: true,//类型：Boolean 默认：true 是否完全压缩  
          preserveComments: 'all' //保留所有注释 
        }),
        rename({suffix: '.min'}),
        gulp.dest('./')
    ],
    cb
  );
});

gulp.task('watch', function() {
  gulp.watch(paths.js, ['compress']);
});

gulp.task('install', ['git-check'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('git-check', function(done) {
  if (!sh.which('git')) {
    console.log(
      '  ' + gutil.colors.red('Git is not installed.'),
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
      '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
    );
    process.exit(1);
  }
  done();
});
