const router = require('express').Router();
const rolesConfig = require('config').get('roles');

var dataListeDeroulante = [];

// Page 'Acualités' est la page par défaut
router.get('/', function(req, res, next) {
    res.redirect('/accueil');
});

router.get('/accueil', function(req, res, next) {
    try {
        dataListeDeroulante = []; // réinitialisation
        
        // Interrogation bdd pour connaitre catalogues auxquels a droit l'utilisateur
        rolesConfig.forEach(function(roleConf) {

            //req.Rights.forEach(function(right) { // Avec 'app.use(authentication);'
                req.app.get('Rights').forEach(function(right) { // Avec module 'authentication_TEST()'
                if(right === roleConf.role) {
                    dataListeDeroulante.push({
                        role: roleConf.role,
                        backoffices: roleConf.backoffices,
                        nomCat: roleConf.nomCat,
                        idCat: roleConf.idCat
                    }); 
                }
            });

        });

        res.render('Accueil', {data_ListeDeroulante: dataListeDeroulante});

    } catch(err) {
        err.customMsg = "Erreur lors de la tentative d'accès à la page 'accueil'";
        next(err);
    }
});

// Sélection d'un catalogue dans la liste déroulante
router.get('/accueil/:idcat', function(req, res, next) {
    try {   
        var listeBO = null;
        dataListeDeroulante.forEach(function(roleConf) {
            if(roleConf.idCat == req.params.idcat) {
                listeBO = {
                    role: roleConf.role,
                    backoffices: roleConf.backoffices,
                    idCat: roleConf.idCat
                }; 
            }
        });
        //console.log("listeBO : " + JSON.stringify(listeBO)); //TEST
        res.send({ liste_BO: listeBO });

    } catch(err) {
        err.customMsg = "Erreur lors de la sélection du catalogue";
        next(err);
    }
});


module.exports = router;