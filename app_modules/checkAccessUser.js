const rolesConfig = require('config').get('roles');
const logger = require('../log/logConfig.js');
const _ = require('lodash');

module.exports = function(req, res, next) {     console.log("On est dans checkAccessUser.js"); //TEST
    try {

        /// 1. Récupération du nom de la page sur laquelle a lieu la requête
        let pg = req.originalUrl;
        pg = pg.substring(pg.indexOf('/') + 1);
        let nomPageUrl = pg.split("/")[0];
        
        /// 2.  Récupération du role correspondant à la page sur laquelle est l'utilisateur
        const roleForThisPage = _.filter(rolesConfig, function(r) { 
            return r.idCat == req.params.idcat && _.find(r.backoffices, _.matches({ 'page': nomPageUrl })) 
        });
        //console.log(JSON.stringify(roleForThisPage)); //TEST
        console.log("req.app.get('Rights') => " + req.app.get('Rights') + " | roleForThisPage[0].role => " + roleForThisPage[0].role); //TEST

        /// 3. Redirection si pas de role pour cette page ou bien utilisateur n'a pas le role correspondant à la page
        if (roleForThisPage.length === 0) { // Si pas de role existant pour cette page...
            logger.log('error', "Authentification : Pas de rôle existant pour la page '" + nomPageUrl + "'.");
            res.render('AccesRefuse', {msgAccesRefuse: "Il n'existe pas de role pour accéder à la page '" + nomPageUrl + "'"});
        } else if (!_.includes(req.app.get('Rights'), roleForThisPage[0].role)) { // ... Si utilisateur n'a pas le role correspondant à cette page...
            logger.log('error', "Authentification : Pas de rôle pour '" + req.app.get('userName') + "'.");
            res.render('AccesRefuse', {msgAccesRefuse: 'Vous n\'avez pas les droits pour accéder à cette page.'});
        }else { // ...Sinon on continue...
            next();
        }

    } catch (error) {
        next(error);
    }

}