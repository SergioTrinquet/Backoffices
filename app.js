const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const path = require('path');
var accueil = require('./routes/rt_Accueil');
var actualites = require('./routes/rt_Actualites');
var erreur = require('./app_modules/erreur');
var authentication = require('./app_modules/authentification');
//var authentication_TEST = require('./app_modules/authentificationV2_TEST'); //TEST
const cookieSession = require('cookie-session');

const app = express();

/// Installation du moteur de template
app.set('view engine', 'ejs');

const env = app.get('env'); /// Pour déterminer dans quel type de configuration on est (production, development, autre)
app.locals.ENV = env; /// Pour que cette valeur soit accessible dans les .ejs
console.log('Mode : ' + env); //TEST

global.appRoot = path.resolve(__dirname); // Variable globale avec affectation du chemin racine du projet. Sert ensuite pour les acces fichiers ds rép. 'data'
app.use(express.static("./public/data"));

app.use(helmet()); /// Helmet helps you secure your Express apps
app.use(express.static("./public/" + (env === 'production' ? 'dist' : 'src'))); /// Pour les fichiers statiques
//app.use(express.static("./public/dist")); /// Pour les fichiers statiques


/// Middleware pour le POST
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: false }));

/* 
const expressfileUpload = require("express-fileupload");
app.use(expressfileUpload()); 
*/

app.use(cookieSession({
    name: 'cookie-session',
    secret: 'qsfeezttsrrtjhdghdfer' // should be a large unguessable string
}));

app.use(authentication); /// Pour authentifier les utilisateurs
//authentication_TEST(app);
app.use(accueil); /// Pour la gestion et l'affichage de la page d'intro.
app.use(actualites); /// Pour la page 'Actualites'
app.use(erreur); /// Middleware de gestion des erreurs

/// On écoute le port
app.listen(process.env.PORT || 8000);