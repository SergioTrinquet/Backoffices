const winston = require('winston');
const format = winston.format;

module.exports = winston.createLogger({
    transports: [
        /*new (winston.transports.Console)({
            colorize: 'all'
        }),*/
        new winston.transports.File({ 
            level: 'info',
            filename: './log/logfile_Combined.log',
            //maxsize: 5242880, //5MB
            handleExceptions: true,
            format: format.combine(
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.printf(info => `--------\n${info.timestamp}\n level: ${info.level}\n login: ${info.login}\n environnement: ${info.environnement}\n url: ${info.url}\n message: ${info.message}`)
            )
        }),
        new winston.transports.File({ 
            level: 'error',
            filename: './log/logfile_Error.log',
            //maxsize: 5242880, //5MB
            handleExceptions: true,
            format: format.combine(
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.printf(info => `--------\n${info.timestamp}\n level: ${info.level}\n login: ${info.login}\n environnement: ${info.environnement}\n erreur_customMsg: ${info.erreur_customMsg}\n détails erreur: ${info.erreur_stack}`)
                //format.simple(), 
                //format.prettyPrint()
            )
        }),
        new winston.transports.File({ 
            level: 'error',
            filename: './log/logfile_JSON_Error.log',
            handleExceptions: true,
            format: format.combine(
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.json()
            )
        })
    ]
});