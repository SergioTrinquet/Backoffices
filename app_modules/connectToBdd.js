const sql = require('mssql');
var dbConfig = require('config').get('dbConfig');

const colors = require('colors'); // Pour le dev.

module.exports = async function(requete) {
    // Version sous forme de Promise (peut être utilisée ensuite comme une promise (=> avec '.then().then()....cath()') ou bien avec async/await )
    return sql.connect(dbConfig)
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
    });
}