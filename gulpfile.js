var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var cleanCSS = require('gulp-clean-css');
var request = require('request');
var source = require('vinyl-source-stream');
var buffer = require('gulp-buffer');
const fse = require('fs-extra');


var paths = {
    styles: {
      //src: 'public/src/styles/**/*.css',
      src: 'public/src/styles/',
      dest: 'public/dist/styles/'
    },
    scripts: {
      //src: 'public/src/scripts/**/*.js',
      src: 'public/src/scripts/',
      dest: 'public/dist/scripts/'
    }
};

var tempJquery = 'TEMPjquery.js';


//== Traitement des .css ==//
function buildCSS_accueil() {
    //return gulp.src(paths.styles.src, {sourcemaps: true})
    return gulp.src(
            [
                paths.styles.src + 'masque.css', 
                paths.styles.src + 'erreur.css', 
                paths.styles.src + 'accueil.css'
            ], 
            {sourcemaps: true}
        )
        .pipe(cleanCSS())
        .pipe(concat('accueil.bundle.css'))
        .pipe(gulp.dest(paths.styles.dest, {sourcemaps: '.'}))
}

function buildCSS_actualites() {
    return gulp.src(
            [
                paths.styles.src + 'masque.css', 
                paths.styles.src + 'erreur.css', 
                paths.styles.src + 'actualites.css', 
                paths.styles.src + 'jQuery.filer/jquery.filer.css',
                paths.styles.src + 'jQuery.filer/themes/jquery.filer-dragdropbox-theme.css',
                paths.styles.src + 'jQuery.sortable/jquery-ui.css'
            ], 
            {sourcemaps: true}
        )
        .pipe(cleanCSS())
        .pipe(concat('actualites.bundle.css'))
        .pipe(gulp.dest(paths.styles.dest, {sourcemaps: '.'}))
}



//== Traitement des .js ==//
function buildScripts_accueil() {
    return gulp
    .src([
        paths.scripts.dest + tempJquery, 
        paths.scripts.src + 'DisplayErreurMsg.js',
        paths.scripts.src + 'Accueil.js'
    ], {sourcemaps: true })
    .pipe(uglify())
    .pipe(concat('Accueil.bundle.js'))
    .pipe(gulp.dest(paths.scripts.dest, {sourcemaps: '.'}));
}

function buildScripts_actualites() {
    //return gulp.src(paths.scripts.src, {sourcemaps: true })
    return gulp
        .src([
            paths.scripts.dest + tempJquery, 
            paths.scripts.src + 'jQuery.sortable/jquery-ui.min.js',
            paths.scripts.src + 'jQuery.filer/jquery.filer.min.js',
            paths.scripts.src + 'DisplayErreurMsg.js',
            paths.scripts.src + 'Actualites.js'
        ], {sourcemaps: true })
        .pipe(uglify())
        .pipe(concat('Actualites.bundle.js'))
        .pipe(gulp.dest(paths.scripts.dest, {sourcemaps: '.'}));
}

// Pour importer les CDN avant bundle
function importCDN() {
    return request('https://code.jquery.com/jquery-1.12.4.js', function(error, response, body) { 
        console.log(error);
    })
    .pipe(source(tempJquery))
    .pipe(buffer())
    .pipe(gulp.dest(paths.scripts.dest));
}

// Suppression du fichier venant du CDN
async function removeFile() {
     try {
        await fse.remove(paths.scripts.dest + tempJquery);
     } catch (error) {
        console.log(error);
     }
}



// CommonJS `exports` module notation to declare tasks
var buildCSS = gulp.series(buildCSS_accueil, buildCSS_actualites);
var buildScripts = gulp.series(importCDN, buildScripts_accueil, buildScripts_actualites, removeFile);
exports.styles = buildCSS;
exports.scripts = buildScripts;


// Défini la tache par défaut qui sera appelée en executant 'gulp' dans le CLI (en invite de commande)
exports.default = gulp.series(buildCSS, buildScripts);