/* jshint laxcomma: true */

var path       = require("path");
var gulp       = require("gulp");
var livereload = require("gulp-livereload");
var sequence   = require("run-sequence");

/*
 * Less compile tasks
 *
 */

var less           = require("gulp-less")
  , LessAutoPrefix = require('less-plugin-autoprefix')
  , minifycss      = require('gulp-minify-css')

  , _less = path.resolve(__dirname, "assets/less")
  , less_ = path.resolve(__dirname, "public/css");

gulp.task("less", function() {
  var ap = new LessAutoPrefix({
    browsers: ["last 2 versions"]
  });

  var cfg = {
    plugins: [ap]
  };

  return gulp.src(path.join(_less, "**/*.less"))
    .pipe(less(cfg))
    .pipe(minifycss({keepSpecialComments: 0}))
    .pipe(gulp.dest(less_));
});

/*
 * Javascript compile tasks
 *
 * Compiles 1 or more javascript bundles through browserify with minification.
 * Setup to handle multiple bundles, eg. public.js -> bundle.js, 
 * admin.js -> admin.js
 *
 */

var browserify = require("browserify")
  , source     = require("vinyl-source-stream")
  , buffer     = require("vinyl-buffer")
  , uglify     = require("gulp-uglify")
  , async      = require("async")

  , _js = path.resolve(__dirname, "assets/javascripts")
  , js_ = path.resolve(__dirname, "public/js");

/*
 * br returns an async function to handle a single bundle
 *
 * @param {Object} opts
 * @return {Function}
 */

function br(opts) {
  return function(callback) {
    var main   = path.join(_js, opts.main || "index.js");
    var out    = opts.out || "bundle.js";
    var config = opts.browserify || {};

    browserify(main, config).bundle()
      .pipe(source(out))
      .pipe(buffer())
      .pipe(uglify())
      .pipe(gulp.dest(js_))
      .on("end", callback);
  };
}

gulp.task("browserify", function(done) {
  var bundles = [
    {main: "index.js", out: "bundle.js"}
  ];

  async.parallel(bundles.map(function(v) {
    return br(v);
  }), done);
});

/*
 * watch tasks
 *
 */

gulp.task("watch-js", function() {
  var include = path.join(_js, "**/*.js");
  var ignore  = "!" + path.join(_js, "**/*_test.js");

  gulp.watch([include, ignore]).on("change", function() {
    sequence("browserify", livereload.reload);
  });
});

gulp.task("watch-css", function() {
  var less = path.join(_less, "**/*.less");
  var css  = path.join(less_, "**/*.css");

  // Compile less
  gulp.watch([less], ["less"]);

  // Livereload without refresh
  gulp.watch([css]).on("change", livereload.changed);
});

gulp.task("watch-views", function() {
  // TODO change your view paths and extensions
  var html = path.join(__dirname, "/views/**/*.html");
  var tmpl = path.join(__dirname, "/views/**/*.tmpl");

  gulp.watch([html, tmpl]).on("change", livereload.changed);
});

gulp.task("livereload", function() {
  livereload.listen();
});

gulp.task("watch", ["livereload"], function() {
  gulp.start("watch-js");
  gulp.start("watch-css");
  gulp.start("watch-views");
});

/*
 * default
 *
 */

gulp.task("default", function(done) {
  sequence("build", "watch", done);
});

/*
 * build
 *
 */

gulp.task("build", function(done) {
  sequence("browserify", "less", done);
});

