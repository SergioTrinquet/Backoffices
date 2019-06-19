const logger = require('../log/logConfig.js');
const email = require('./mail.js');
const colors = require('colors'); //Juste pour le dev

module.exports = function(err, req, res, next) {

    let userName = req.app.get('userName');
    let env = req.app.get('env');

    // En phase de dev.
    console.log(colors.bgRed.white(err));

    // Mail envoi d'erreur
    if(req.app.locals.ENV === 'production') {
        email(userName, err, req.originalUrl).catch((error) => {
            console.log(colors.bgRed.white(error));
            logger.log('error', {"Erreur lors de l'envoi de mail": error},
            {
                login: userName, 
                environnement: env, 
                erreur_stack: err.stack 
            });
        });
    }

    // Log d'erreur
    logger.log(
        'error', 
        err, 
        {
            login: userName, 
            environnement: env, 
            erreur_customMsg: err.customMsg,
            erreur_stack: err.stack 
        }
    ); 

    // Affichage msg d'erreur
    if(req.xhr) {
        //res.status(err.status || 500).send({ titre: err.customMsg, message: err.message, stack: err.stack }); // Version en JSON
        res
            .status(err.status || 500)
            .render('templates/encartErreur', { titre: err.customMsg, message: err.message, stack: err.stack }); // Version en Html
    
    } else {

        res
            .status(err.status || 500)
            .render('Erreur', { 
                titre: err.customMsg, 
                message: err.message, 
                stack: err.stack 
            });

    }
}
