/* jshint laxcomma: true */

var path     = require("path");
var gulp     = require("gulp");
var watch    = require("gulp-watch");
var sequence = require("run-sequence");
var argv     = require("yargs").argv;

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

  var include = path.join(_less, "**/*.less");
  var ignore  = "!" + path.join(_less, "lib/**/*.less");

  return gulp.src([
    include,
    ignore
  ])
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

    if (argv.react) {
      if (!!!config.transform) {
        config.transform = [];
      }

      config.transform.push(require("reactify"));
    }

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
 * go runner
 *
 */

var gulpgo = require("gulp-go");

var go;

function out(prefix) {
  prefix = (prefix || "");
  return function(data) {
    console.log(prefix, data.toString());
  };
}

gulp.task("go-run", function() {
  go = gulpgo.run("main.go", [], {
    cwd:       __dirname,
    onStdout:  out(),
    onStderr:  out("[error]"),
    onClose:   out("close"),
    onExit:    out("exit")
  });
});

gulp.task("devs", ["go-run", "watch"], function() {
  var include = path.join(__dirname, "**/*.go");
  var ignore  = "!" + path.join(__dirname, "**/*_test.go");

  watch([include, ignore], function() {
    go.restart();
  });
});

/*
 * watch tasks
 *
 */

var livereload = require("gulp-livereload");

gulp.task("watch-js", function() {
  var include = path.join(_js, "**/*.js");
  var ignore  = "!" + path.join(_js, "**/*_test.js");

  watch([include, ignore], function() {
    sequence("browserify", livereload.reload);
  });
});

gulp.task("watch-css", function() {
  var less = path.join(_less, "**/*.less");
  var css  = path.join(less_, "**/*.css");

  // Compile less
  watch([less], function() {
    sequence("less");
  });

  // Livereload without refresh
  watch([css], livereload.changed);
});

gulp.task("watch-views", function() {
  // TODO change your view paths and extensions
  var html = path.join(__dirname, "/app/views/**/*.html");
  var tmpl = path.join(__dirname, "/app/views/**/*.tmpl");

  watch([html, tmpl], livereload.changed);
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

