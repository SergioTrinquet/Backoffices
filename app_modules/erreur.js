const logger = require('../log/logConfig.js');
const colors = require('colors'); //Juste pour le dev

module.exports = function(err, req, res ,next) {
    console.log(colors.bgRed.white(err)); //TEST
    logger.log(
        'error', 
        err, 
        {
            login: req.app.get('userName'), 
            environnement: req.app.get('env'), 
            erreur_stack: err.stack 
        }
    ); 

    if(req.xhr) { //
        //res.status(err.status || 500).send({ titre: err.customMsg, message: err.message, stack: err.stack }); // Version en JSON
        res
            .status(err.status || 500)
            .render('templates/encartErreur', { titre: err.customMsg, message: err.message, stack: err.stack }); // Version en Html
    } else { //

        res
            .status(err.status || 500)
            .render('Erreur', { 
                titre: err.customMsg, 
                message: err.message, 
                stack: err.stack 
            });

    } //
}
