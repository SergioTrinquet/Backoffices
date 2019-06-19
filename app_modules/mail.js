const nodemailer = require('nodemailer');
const config = require("config");

module.exports = async function(user, err, path) {    
    const dataConfigMail = config.get('infosMailConfig');

    const transporter = nodemailer.createTransport({
        host: dataConfigMail.mailTransporter.host,
        port: dataConfigMail.mailTransporter.port,
        secure: dataConfigMail.mailTransporter.secure, // upgrade later with STARTTLS
        auth: {
            user: dataConfigMail.mailTransporter.user,
            pass: dataConfigMail.mailTransporter.pass
        }
    });


    let message = {
        from: dataConfigMail.mailMessage.from,
        to: dataConfigMail.mailMessage.to,
        subject: "Erreur sur l'application 'Backoffices'",
        //text: 'Plaintext version of the message',
        html: "<div style='font-family: Arial, Helvetica, sans-serif'>\
                    <div style='font-weight: bold;'>Backoffices (chemin : " + path + ")</div><div>Utilisateur : " + user + "</div>\
                    <div style='background-color:#ff0000; color:#ffffff; font-weight:bold; text-align:center; padding:10px; margin:10px;'>\
                        " + err.customMsg + "\
                        <div style='margin: 5px 0 0 0;'>" + err.message + "</div>\
                    </div>\
                    <p><u style='margin:0 0 5px 0;'>Détails de l'erreur survenue à " + new Date().toLocaleString() + " " + new Date().getMilliseconds() + "ms</u> :<br/>\
                    " + err.stack + "</p>\
                </div>"
    };

    
    await transporter.sendMail(message);
}