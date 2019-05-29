const sql = require('mssql');
var dbConfig = require('config').get('dbConfig');

const colors = require('colors'); // Pour le dev.

module.exports = async function(requete) {
    // Version sous forme de Promise (peut être utilisée ensuite comme une promise (=> avec '.then().then()....cath()') ou bien avec async/await )
    sql.close(); // Ajouté car parfois bug après exec plusieurs fois de suite dans la meme sec. (et je ne sais pas pourquoi!) car pas le temps de se fermer, donc je ferme d'entrée de jeu la connection au cas ou elle serait restée ouverte ("réinitialisation" en quelque sorte)
    
    // V1 : Avec Promesses
    /*return sql.connect(dbConfig)
    .then(pool => {
        return pool.request().query(requete)
    })
    .then(recordset => {
        sql.close();
        console.log(colors.bgGreen.white(JSON.stringify(recordset))); //TEST
        return recordset;
    })
    .catch(err => {      console.log('err => ' + err); //TEST
        sql.close();
        err.customMsg = "Phase de connection à la base de données"
        throw err;
    });*/


    // V2 : Avec async/await
     try {
        let pool = await sql.connect(dbConfig);
        let recordset = await pool.request().query(requete);
        sql.close();
        console.log(colors.bgGreen.white(JSON.stringify(recordset))); //TEST
        return recordset;
    } catch (err) {
        sql.close();
        console.log('err => ' + err); //TEST
        err.customMsg = "Phase de connection à la base de données"
        throw err;
    } 

}