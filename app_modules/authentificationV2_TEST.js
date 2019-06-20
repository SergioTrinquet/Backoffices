const _ = require('underscore');
var rolesConfig = require('config').get('roles');
const logger = require('../log/logConfig.js');
const connectToBdd = require('./connectToBdd.js');
const colors = require('colors'); // Pour le dev.

module.exports = async function(app) {
    try {
        /// Récupération de l'identifiant de l'utilisateur
        var nomUtilisateur = "Non identifié";
        var environnement = app.get('env');

        if(environnement === 'production') {
            nomUtilisateur = headers['x-iisnode-auth_user'];
            nomUtilisateur = nomUtilisateur.replace("AD\\", "").replace("ad\\", ""); // Pour retirer le nom de domaine, sinon 'AD\jmartin' par ex.
        } else if(environnement === 'development') {
            const path = require('path');
            nomUtilisateur = process.env['USERPROFILE'].split(path.sep)[2];
        }

        app.set('userName', nomUtilisateur);
        app.locals.UserName = nomUtilisateur; /// Pour rendre l'info accessible directement dans les vues



        /// Consultation du/des role(s) de l'utilisateur avec son identifiant pour récupérer ses droits
        let nom = null;
        let droits = null;
        if(req.session.populated) {
            nom = req.session.dataUser.user;
            droits = req.session.dataUser.rights;
        }

        if( (!droits) || (droits && nom !== nomUtilisateur) ) {  // Si pas de 'droits' (sous-entendu pas de session), ou bien si session mais que l'utilisateur est différent de celui enregistré dans la session...
            // V1 - Test avec Promise : FONCTIONNE !
            /*
            getRoles_Promise()
            .then(function() { console.log('C est fini !!'); next(); } );
            .catch((err) { next(err); });
            */

            // V2 - Test avec async : FONCTIONNE !!
            /*
            await getRoles_Promise();
            console.log('C est fini !!');
            */
            
            // V3
            try {

                const resultat = await AsyncGetRoles(nomUtilisateur);
                //console.log(colors.bgMagenta.white(JSON.stringify(resultat.recordset[1]["RoleName"]))); //TEST
                console.log(colors.bgMagenta.white(JSON.stringify(_.pluck(resultat.recordset, 'RoleName')))); //TEST
                
                if (resultat.recordset.length === 0) { /// Si pas de rôle
                    logger.log('error', "Authentification : Pas de rôle pour '" + nomUtilisateur + "'.");
                    res.render('AccesRefuse', {msgAccesRefuse: 'Vous n\'avez pas les droits pour accéder à cette page.'}); // Redirection
                } else {
                    app.set('Rights', _.pluck(resultat.recordset, 'RoleName'));    
                    app.locals.Rights = app.get('Rights'); /// Pour rendre ces infos accessibles dans la vue 'userInfo.ejs'
                    req.app.set('Rights', req.Rights);
                    // On créé une session dans laquelle on stocke les droits de l'utilisateur 
                    // pour éviter requete ds bdd lors des futurs appels
                    req.session.dataUser = {"rights": req.Rights, "user": nomUtilisateur};
                    next();
                }

            } catch (err) {
                next(err);
            }


        } else {
            req.Rights = droits;
            //req.app.locals.Rights = req.Rights; /// Pour rendre ces infos accessibles au niveau de la vue 'userInfo.ejs'
            req.app.set('Rights', req.Rights);
            next();
        }


        
    } catch (err) {
        if(!err.customMsg) { err.customMsg = "Erreur au niveau de l'authentification"; }
        next(err)
    }

}


// V1 et V2 suite
/*function getRoles_Promise() {
    return new Promise(function(resolve, reject) { // Les 2 lignes ci-dessous fonctionnent !
        //setTimeout(function() { resolve(console.log('On a attendu 2s.')) }, 2000)
        setTimeout(function() { console.log('On a attendu 2s.'); resolve(); }, 2000)
    });
}*/


// V3 suite
///--- Pour récupérer le(s) role(s) d'un utilisateur ---///
async function AsyncGetRoles(nom) {
    try {

        /// Traitement pour ajouter des apostrophes aux éléments du tableau de rôles
        var tempTab = [];
        rolesConfig.forEach(function(roleCf) { tempTab.push("'" + roleCf.role + "'"); });

        var requete = "" +
        "SELECT Appli.ApplicationRole.RoleName " +
        "FROM Appli.UserInApplicationRole " + 
            "LEFT OUTER JOIN Appli.ApplicationRole ON Appli.UserInApplicationRole.ApplicationRoleID = Appli.ApplicationRole.ApplicationRoleID " +
            "RIGHT OUTER JOIN Appli.[User] ON Appli.UserInApplicationRole.UserID = Appli.[User].UserID " +
        "WHERE (Appli.[User].Login = '" + nom + "') AND Appli.ApplicationRole.RoleName in(" + tempTab.join(", ") + ")";

        const results = await connectToBdd(requete);
        
        console.log(colors.bgBlue.white(JSON.stringify(results))); //TEST
        return results;

        // FONCTIONNE AUSSi !!
        /*GetFromDataBase(requete)
        .then((results) => {  return results; })*/

            
    } catch(err) {
        err.customMsg = "Phase de récupération du role de l'utilisateur pour affecter les droits"; // Propriété ajoutée pour identifier plus vite ou se trouve l'erreure ds le message géré par le middleware d'erreur ds 'app.js'
        throw err;
    }
}
