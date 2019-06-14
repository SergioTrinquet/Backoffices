const router = require('express').Router();
const _ = require('lodash');
const fse = require('fs-extra');
const path = require('path');
const checkAccessUser = require('../app_modules/checkAccessUser.js'); /// Middleware pour gérer les accès en fonction des droits de l'utilisateur
const config = require('config');
const connectToBdd = require('../app_modules/connectToBdd.js');
const networkDrive = require('windows-network-drive'); // Pour montage lecteur réseau
const colors = require('colors'); //Juste pour le dev

// EN COURS : Solution de l'app.use pour éviter d'appeler dans chaque router les mêmes fonctions
/*router.use('/Actualites/:idcat', async function(req, res, next) {
    console.log("<<<< Je suis ds le router.use >>>>"); //TEST
    try {
        const listeFournisseurs = await getListeFournisseurs('/Actualites/' + req.params.idcat);
        req.app.set('listeFournisseurs', listeFournisseurs.recordset);
        next();
    } catch (err) {
        next(err);
    }
});*/

/**/
const expressfileUpload = require("express-fileupload");
router.use(expressfileUpload());
/**/


//router.all('/Actualites/:idcat', checkAccessUser); // A TESTER et retirer 'checkAccessUser' de tous les router)


// Arrivée sur la page : Chargement du contenu
router.get('/Actualites/:idcat', checkAccessUser, async function(req, res, next) {      console.log(colors.bgYellow.black("router.get('/Actualites/:idcat')")); //TEST
    try { 
        ///// TEST /////
        /*try {
            let drives = await networkDrive.list();
            console.log(drives);
        } catch (err) {
            console.log("=> " + err);
        }*/
        ///// TEST /////  

        // Récupération du contenu du fichier .json
        const role = _.filter(config.get('roles'), function(r) { return r.idCat == req.params.idcat }); // Récupération du role
        const directoryPath = getDirectoryPath(req, role);
        const nomCatShort = role[0].nomCatShort;

        // Check si existence du fichier '*.json' et si n'existe pas on le créé
        await CheckJSONFileExist(directoryPath, nomCatShort);
        
        // Check si existence du fichier '*_TEMP.json'
        let isTempFileExists = await CheckTempFileExist(directoryPath, nomCatShort);
        // Si IsTempFileExists = true, on le lit, sinon on lit le fichier qui n'est pas '*_TEMP.json'
        let pathJsonFile = path.join(directoryPath, "json_" + nomCatShort + (isTempFileExists ? "_TEMP" : "") + ".json"); // Pour obtenir le path pour lire/écrire le fichier .json
        let contenuJsonFile = await readFile(pathJsonFile);
        
        // Récupération du nom du catalogue pour la vue 'Actualites.ejs'
        req.app.locals.nomCatShort = capitalize(nomCatShort);
        
        // Récupération des paramètres pour l'upload file
        let goodBackoffice = _.filter(role[0].backoffices, function(rb) { return rb.page == "Actualites" });
        let paramsUploadFile = goodBackoffice[0].uploadFile;
        
        res.render('Actualites', { 
            nomCat: role[0].nomCat, 
            contenuFile: contenuJsonFile.rubriques,
            paramsUploadFile: paramsUploadFile,
            isTempFileExists: isTempFileExists
        });

    } catch(err) {
        if(!err.customMsg) { err.customMsg = "Erreur au chargement de la page 'actualites'"; }
        next(err);
    }
});



// Quand modif. => Changement d'ordre des liens,...
router.post('/Actualites/:idcat/chgmtordreliens', checkAccessUser, async function(req, res, next) {     console.log(colors.bgYellow.black("router.post('/Actualites/:idcat/chgmtordreliens')")); //TEST
    try {
        // Récupération du nvel ordre des liens dans la vue
        let orderLinks = JSON.parse(req.body.OrderLinks);

        // On isole l'index de la rubrique modifiée au niveau de la vue
        let idxRubriqueVue = orderLinks[0].substring(0, orderLinks[0].indexOf("_"));

        const pathJsonFile = await getPathTEMPJsonFile(req);   //console.log(pathJsonFile); //TEST

        let contenuJsonFile = await readFile(pathJsonFile);  // Affectation données du fichier '*_TEMP.json' pour modifier après le contenu

        let liensBonneRubriqueJsonFile = contenuJsonFile.rubriques[idxRubriqueVue].liens; 
        
        // On prélève le nouvel ordre des liens, puis on push dans un tableau les liens reccueillis à partir du .json et classés dans le nouvel ordre
        let liensNvelOrdre = [];
        orderLinks.forEach(function(lk) {
            let idx = lk.substring(lk.indexOf("_") + 1, lk.length);
            liensNvelOrdre.push(liensBonneRubriqueJsonFile[idx]);
        });
        //console.log(colors.bgYellow.green(liensNvelOrdre)); //TEST

        contenuJsonFile.rubriques[idxRubriqueVue].liens = liensNvelOrdre;
        let NouveauContenuJsonFile = contenuJsonFile;
        //console.log(colors.bgCyan.red(JSON.stringify(NouveauContenuJsonFile))); //TEST

        // Remplacement dans le .json des liens de la rubrique nouvellement ordonnés 
        await modifFile(pathJsonFile, NouveauContenuJsonFile);


        // Envoi bloc html à la vue principale 'Actualites.ejs' avec les liens modifiés
        let rubriqueModifiee = contenuJsonFile.rubriques[idxRubriqueVue];
        let BtUp= false; let BtDown = false;
        if(parseInt(idxRubriqueVue) === 0) { BtUp = true }
        if(parseInt(idxRubriqueVue) === (contenuJsonFile.rubriques.length - 1)) { BtDown = true }
        
        res.render('templates/rubrique', { contenuFile:[rubriqueModifiee], idRubr: idxRubriqueVue, btsUpDownDisabled: {Up: BtUp, Down: BtDown } }, function(err, html) {
            if(err) { 
                if(!err.customMsg) { err.customMsg = "Appel du template de la rubrique"; }
                throw err;
            } 
            res.send(html);
        });


    } catch(err) {
        if(!err.customMsg) { err.customMsg = "Phase de changement d'ordre des liens"; }
        next(err);
    }
});


// Click sur 'Ajouter une rubrique' : Récupération d'interface de saisie
router.get('/Actualites/:idcat/newRubrique/:typeLien', checkAccessUser, async function(req, res, next) {        console.log(colors.bgYellow.black("router.get('/Actualites/:idcat/newRubrique/:typeLien')")); //TEST
    try {       

        const listeFournisseurs = await getListeFournisseurs(req.params.idcat); // Récupération liste des fournisseurs pour alimenter le select en phase d'ajout/modif le lien/rubrique
        res.render('templates/rubrique_new', { listeFournisseurs: listeFournisseurs.recordset, typeDeLien: req.params.typeLien }, function(err, html) {
            if(err) { 
                if(!err.customMsg) { err.customMsg = "Appel du template de création d'une rubrique"; }
                throw err;
            } 
            res.send(html);
        });

    } catch(err) {
        /*res.status(err.status || 500).send({
            titre: "Chargement de l'interface de saisie d'une nouvelle rubrique", 
            erreur: {resume: err.name + ' : ' + err.message, stack: err.stack }
        });*/

        if(!err.customMsg) { err.customMsg = "Chargement de l'interface de saisie d'une nouvelle rubrique"; } // Si pas d'erreur dans le try...
        next(err);
    }
});


// Click sur 'Ajouter un lien' : Récupération d'interface de saisie
router.get('/Actualites/:idcat/newLink/:typeLien', checkAccessUser, async function(req, res, next) {        console.log(colors.bgYellow.black("router.get('/Actualites/:idcat/newLink/:typeLien')")); //TEST
    try {       

        const listeFournisseurs = await getListeFournisseurs(req.params.idcat); // Récupération liste des fournisseurs pour alimenter le select en phase d'ajout/modif le lien/rubrique
        res.render('templates/lien_new', { listeFournisseurs: listeFournisseurs.recordset, typeDeLien: req.params.typeLien }, function(err, html) {
            if(err) { 
                if(!err.customMsg) { err.customMsg = "Appel du template de création d'un lien"; }
                throw err;
            } 
            res.send(html);
        });

    } catch(err) {
        if(!err.customMsg) { err.customMsg = "Chargement de l'interface de saisie d'un nouveau lien"; }
        next(err);
    }
});



// Click sur 'modifier un lien' : Récupération d'interface de saisie
router.post('/Actualites/:idcat/modifLink', checkAccessUser, async function(req, res, next) {        console.log(colors.bgYellow.black("router.get('/Actualites/:idcat/modifLink')")); //TEST
    try {
        const listeFournisseurs = await getListeFournisseurs(req.params.idcat); // Récupération liste des fournisseurs pour alimenter le select en phase d'ajout/modif le lien/rubrique  
        let dataLinkToMod = JSON.parse(req.body.dataLinkToMod);
        // Suppression des espaces potentiels sur chaque cfr du tableau (si saisi à la main)
        let listeFnrs_trim = dataLinkToMod.listeFnrs.map((fnr) => fnr.trim()); 
        dataLinkToMod.listeFnrs = listeFnrs_trim;
        
        res.render('templates/lien_modif', { listeFournisseurs: listeFournisseurs.recordset, dataLinkToMod: dataLinkToMod }, function(err, html) {
            if(err) { 
                if(!err.customMsg) { err.customMsg = "Appel du template de modification d'un lien"; }
                throw err;
            } 
            res.send(html);
        });
    } catch(err) {
        if(!err.customMsg) { err.customMsg = "Chargement de l'interface de saisie de modification d'un lien"; }
        next(err);
    }
});



 
// Lors de phase de modification d'un lien, click sur bt 'Modifier' pour récupérer bonne interface de modif de lien (input file ou text)
router.get('/Actualites/:idcat/modifLink/:typeLien', checkAccessUser, async function(req, res, next) {        console.log(colors.bgYellow.black("router.get('/Actualites/:idcat/modifLink/:typeLien')")); //TEST
    try {
        res.render('templates/cible', {typeDeLien: req.params.typeLien }, function(err, html) {
            res.send(html);
        });
    } catch(err) {
        if(!err.customMsg) { err.customMsg = "Récupération du type de champ de saisie 'Hyperlien' lors de la phase de modification d'un lien"; }
        next(err);
    }
});



// Upload de fichier
router.post('/Actualites/:idcat/upload', checkAccessUser, function(req, res, next) {            console.log(colors.bgYellow.black("router.post('/Actualites/:idcat/upload')")); //TEST
    try {
        
        if(Object.keys(req.files).length == 0) { 
            throw ({customMsg: "Aucun fichier n'a été uploadé" });
        }
        
        let inputFile = Object.values(req.files)[0];    // Normalement on fait 'req.files.NomDeInputFile' mais ici l'input file a des crochets ('UploadFileForLink[]') qui ne sont pas acceptés avec la syntaxe en question
        //console.log("inputFile => " + colors.bgRed.yellow(inputFile)); console.log(req.files); //TEST
        
        // Récupération du chemin
        const role = _.filter(config.get('roles'), function(r) { return r.idCat == req.params.idcat }); // Récupération du role
        const uploadedFilesDirectory = config.get('pathFiles').local_dir_uploadedFiles;
        //const pathForUploadFile = path.join(getDirectoryPath(req, role), uploadedFilesDirectory, inputFile.name + "_" + Date.now());
        const pathForUploadFile = path.join(getDirectoryPath(req, role), uploadedFilesDirectory, inputFile.name);

        // Récupération des paramètres de config obligatoires pour l'upload file
        let goodBackoffice = _.filter(role[0].backoffices, function(rb) { return rb.page == "Actualites" });
        let maxSize = goodBackoffice[0].uploadFile.maxSize; // Taille max. autorisée
        let extensionsAuth = goodBackoffice[0].uploadFile.extensionsAutorisees; // Extensions autorisées
        
        let inputFile_Extension = inputFile.name.substring(inputFile.name.lastIndexOf(".") + 1, inputFile.name.length);
        let inputFile_Size = inputFile.size/1024/1024; // Taille du fichier à uploader exprimé en Mo 

        if(inputFile_Size > maxSize) { // Si fichier trop lourd...
            next({
                customMsg:"Fichier trop lourd !", 
                message: "Votre fichier est trop lourd (" + inputFile_Size.toString() + "Mo). Le fichier téléchargé doit faire " + maxSize.toString() + "Mo maximum."
            });
            //res.status(500).send({titre: "Fichier trop lourd !!! (" + inputFile_Size.toString() + "Mo).", erreur: "blabla" }); // V2 avec affichage popin d'erreur géré entièrement coté front
        } else if(extensionsAuth.indexOf(inputFile_Extension) == -1) { //...Si pas bon format...
            next({
                customMsg:"Format non autorisé !", 
                message: "Format '." + inputFile_Extension + "' non autorisé. Les formats autorisés sont " + extensionsAuth.join(", ") 
            });
        } else { // ...Sinon si tout va bien, téléchargement
            inputFile.mv(pathForUploadFile, function(err) {
                if (err) { throw err; }
                res.send({nomFichierUpload: inputFile.name});
            });
        }

    } catch (err) {
        if(!err.customMsg) { err.customMsg = "Etape de l'upload de fichier"; }
        next(err);
    }
});





// Suppression du fichier via l'interface d'upload de fichier (jquery.filer)
router.post('/Actualites/:idcat/localFileToDelete', checkAccessUser, async function(req, res, next) {       console.log(colors.bgYellow.black("router.post('/Actualites/:idcat/localFileToDelete')")); //TEST
    try {
        await deleteLocalFile(req, req.body.fileToDelete);
        res.send({ok: true});
    } catch(err) {
        if(!err.customMsg) { err.customMsg = "Etape de suppression d'un fichier sur le serveur local"; }
        next(err);
    }
});


// Click sur 'Supprimer' pour un lien
router.post('/Actualites/:idcat/deleteLink/:idlink', checkAccessUser, async function(req, res, next) {      console.log(colors.bgYellow.black("router.post('/Actualites/:idcat/deleteLink/:idlink')")); //TEST
    try {  
        // Récupération de l'id du lien
        const idlink = req.params.idlink;
        const idx_RandL = idlink.split("_");
        const idx_Rubr = idx_RandL[0];
        const idx_Lien = idx_RandL[1];

        // Récupération du chemin du fichier '*_TEMP.json'
        const pathJsonFile = await getPathTEMPJsonFile(req);   
        // Affectation données du fichier '*_TEMP.json' dans var.
        let contenuJsonFile = await readFile(pathJsonFile);        

        let lienAsupprimer = contenuJsonFile.rubriques[idx_Rubr].liens[idx_Lien];
        // Suppression du fichier qui a potentiellement été uploadé pdt cette session (Suppression sur serveur du BackOffice)
        if(lienAsupprimer.typeLien_TEMP == "fichier") {
        /*if(lienAsupprimer.typeLien_TEMP == "fichier" && lienAsupprimer.cible_TEMP != "") {*/
            await deleteLocalFile(req, lienAsupprimer.cible_TEMP);
        } 
        
        // Gestion de la suppression du fichier sur serveur de prod. (Fichier uploadé lors de précédentes sessions: passage de la propriété "cible" dans "FichiersASupprEnProd", si cela n'a pas déjà été fait)   
        if(lienAsupprimer.typeLien == "fichier") { // Check cas ou peut être nul comme qd création d'un nv lien
            contenuJsonFile.FichiersASupprEnProd.push(lienAsupprimer.cible);
        }

        // Retrait du lien du JSON
        contenuJsonFile.rubriques[idx_Rubr].liens.splice(idx_Lien, 1);
        // Modif du fichier avec le nouveau JSON (sans le lien donc) 
        await modifFile(pathJsonFile, contenuJsonFile);

        // Envoi bloc html à la vue principale 'Actualites.ejs' avec le lien supprimé
        res.render('templates/rubrique', { contenuFile: contenuJsonFile.rubriques }, function(err, html) {
            if(err) { 
                if(!err.customMsg) { err.customMsg = "Appel du template de la rubrique suite à suppression d'un lien"; }
                throw err;
            } 
            res.send(html);
        });

 
    } catch (err) {
        if(!err.customMsg) { err.customMsg = "Etape de suppression d'un lien"; } // Si pas d'erreur dans le try...
        next(err);
    }
});


// Click sur 'Supprimer' pour une rubrique
router.post('/Actualites/:idcat/deleteRubrique/:idrubr', checkAccessUser, async function(req, res, next) {      console.log(colors.bgYellow.black("router.post('/Actualites/:idcat/deleteRubrique/:idrubr')")); //TEST
    try {   
        const idrubr = req.params.idrubr;

        const pathJsonFile = await getPathTEMPJsonFile(req); // Récupération du chemin du fichier '*_TEMP.json'   
        let contenuJsonFile = await readFile(pathJsonFile); // Affectation données du fichier '*_TEMP.json' dans var.      
        
        // Ici utilisation de Promise.all au lieu d'un '.forEach()' par ex. car forEach lance les fonctions asynchrones sans qu'elles soient corrélées, donc sans attendre la fin,
        // 'Promise.all()' attend que l'ensemble des promesses soient tenues => Executions en parallèle
        // La 2eme option aurait été d'utiliser 'for (const liensRubrique of lien) {...}' mais exécute en séquence 
        let liensRubrique = contenuJsonFile.rubriques[idrubr].liens;
        await Promise.all(liensRubrique.map(async function(lien) {
            // Suppression des fichiers qui ont potentiellement été uploadés pdt cette session (Suppression sur serveur du BackOffice)        
            if(lien.typeLien_TEMP == "fichier") {
                await deleteLocalFile(req, lien.cible_TEMP);
                //console.log("lien.cible_TEMP => " + lien.cible_TEMP); //TEST
            } 

            // Gestion des suppressions de fichiers sur serveur de prod. (Fichier(s) uploadé(s) lors de précédentes sessions: passage de la propriété "cible" dans "FichiersASupprEnProd", si cela n'a pas déjà été fait)    
            if(lien.typeLien == "fichier") { // Check cas ou peut être nul comme qd création d'un nv lien
                contenuJsonFile.FichiersASupprEnProd.push(lien.cible);
            }
        }))
        

        contenuJsonFile.rubriques.splice(idrubr, 1); // Retrait de la rubrique du JSON       
        await modifFile(pathJsonFile, contenuJsonFile); // Modif du fichier avec le nouveau JSON (sans la rubrique donc) 
 
        // Envoi bloc html à la vue principale 'Actualites.ejs' avec le lien supprimé
        res.render('templates/rubrique', { contenuFile: contenuJsonFile.rubriques }, function(err, html) {
            if(err) { 
                if(!err.customMsg) { err.customMsg = "Appel du template de la rubrique suite à suppression d'une rubrique"; }
                throw err;
            } 
            res.send(html);
        });

    } catch(err) {
        if(!err.customMsg) { err.customMsg = "Etape de suppression d'une rubrique"; } // Si pas d'erreur dans le try...
        next(err);
    }
});



// Click sur 'Enregistrer' pour une rubrique existante
router.post('/Actualites/:idcat/recordLibelleRubrique/:idrubr', checkAccessUser, async function(req, res, next) {      console.log(colors.bgYellow.black("router.post('/Actualites/:idcat/recordLibelleRubrique/:idrubr')")); //TEST
    try {
        const idrubr = req.params.idrubr;
        const nvLibelle = req.body.libelleRubrique;

        const pathJsonFile = await getPathTEMPJsonFile(req); // Récupération du chemin du fichier '*_TEMP.json'   
        let contenuJsonFile = await readFile(pathJsonFile); // Affectation données du fichier '*_TEMP.json' dans var.      
        
        contenuJsonFile.rubriques[idrubr].rubrique = nvLibelle; // Ecriture du nv libellé ds le JSON
        await modifFile(pathJsonFile, contenuJsonFile); // Modif du fichier avec le JSON modifié

        res.send({ok: true, nvLibelle: nvLibelle});
    } catch(err) {
        if(!err.customMsg) { err.customMsg = "Etape d'enregistrement de modif de libellé d'une rubrique"; } // Si pas d'erreur dans le try...
        next(err);
    }
});


// Click sur 'Enregistrer' pour une nvelle rubrique ou un nv lien
router.post('/Actualites/:idcat/recordDataNewRubriqueOrLink', checkAccessUser, async function(req, res, next) {      console.log(colors.bgYellow.black("router.post('/Actualites/:idcat/recordDataNewRubriqueOrLink')")); //TEST
    try {   
        const data = JSON.parse(req.body.newElement);
        console.log(data); //TEST
        
        // 1. Check comme coté client si champs obligatoires pas remplis, avec gestion des erreurs
        if(data.idRubrique === -1) {
            if(data.intituleRubrique === "") {
                throw {customMsg: "Intitulé de rubrique vide lors de la création d'une nouvelle rubrique"}
            }
        }
        if(data.lienRubrique.intitule === "") { throw {customMsg: "Intitulé de lien manquant"}; }
        if(data.lienRubrique.typeLien === null) { throw {customMsg: "Propriété 'Type de lien' non spécifié"}; }
        if(data.lienRubrique.cible === "") { throw {customMsg: "Cible du lien non spécifiée"}; }

        
        // 2. Lecture JSON et manip de l'objet en question
        const pathJsonFile = await getPathTEMPJsonFile(req); // Récupération du chemin du fichier '*_TEMP.json'   
        let contenuJsonFile = await readFile(pathJsonFile); // Affectation données du fichier '*_TEMP.json' dans var.      
        
        // Affectation valeurs ds JSON
        const nvlien = {
            "intitule": data.lienRubrique.intitule,
            //"typeLien": data.lienRubrique.typeLien,
            "typeLien": "",
            "cible": "",
            "fournisseurs": data.lienRubrique.fournisseurs.join(","),
            "typeLien_TEMP": data.lienRubrique.typeLien,
            "cible_TEMP": data.lienRubrique.cible
        }

        if(data.idRubrique === -1) { // Si création d'une nvelle rubrique...
            const nvlRubrique = {
                "rubrique": data.intituleRubrique,
                "liens": [nvlien]
            };
            contenuJsonFile.rubriques.unshift(nvlRubrique); // Intégration de la nouvelle rubrique en premier ds 'contenuJsonFile'
        } else { // ...Sinon si juste création d'un nouveau lien...
            contenuJsonFile.rubriques[data.idRubrique].liens.unshift(nvlien); // Intégration du nv lien en premier ds la bonne rubrique ds 'contenuJsonFile'
        }

        //console.log(colors.bgCyan.yellow(JSON.stringify(contenuJsonFile))); //TEST

        await modifFile(pathJsonFile, contenuJsonFile); // Modif du fichier avec le nouveau JSON (sans la rubrique donc) 

        // 3. Envoi template HTML
        // Envoi bloc html à la vue principale 'Actualites.ejs' avec nvelle rubr. ou nv lien
        res.render('templates/rubrique', { contenuFile: contenuJsonFile.rubriques }, function(err, html) {
            if(err) { 
                if(!err.customMsg) { err.customMsg = "Appel du template de la rubrique lors de l'étape d'enregistrement d'une nouvelle rubrique ou d'un nouveau lien"; }
                throw err;
            } 
            res.send(html);
        });

    } catch (err) {
        if(!err.customMsg) { err.customMsg = "Etape d'enregistrement d'une nouvelle rubrique ou d'un nouveau lien"; } // Si pas d'erreur dans le try...
        next(err);
    }
});



//  Click sur 'Enregistrer' après une modif de lien
router.post('/Actualites/:idcat/recordDataModifLink/:idlien', checkAccessUser, async function(req, res, next) {           console.log(colors.bgYellow.black("router.post('/Actualites/:idcat/recordDataModifLink/:idlien')")); //TEST
    try {
        //console.log("data du lien en cours de modif => " + req.body.newElement); //TEST
        const data = JSON.parse(req.body.newElement);
        
        // 1. Check comme coté client si champs obligatoires pas remplis, avec gestion des erreurs
        if(data.intitule === "") { throw {customMsg: "Intitulé de lien manquant"}; }
        if((data.typeLien === "-" && data.cible !== "") || data.typeLien === null) { throw {customMsg: "Propriété 'Type de lien' non spécifié"}; }
        if(data.typeLien !== "-" && data.cible === "") { throw {customMsg: "Cible du lien non spécifiée"}; }

        // 2. Récupération objet JSON à partir du fichier
        const pathJsonFile = await getPathTEMPJsonFile(req); // Récupération du chemin du fichier '*_TEMP.json'   
        let contenuJsonFile = await readFile(pathJsonFile); // Affectation données du fichier '*_TEMP.json' dans var.      

        // En fonction des données des propriétés de l'objet 'data', on sait :
        // - S'il n'y a pas eu modif de l'Hyperlien, 
        // - S'il y a eu modif et que c'est un fichier
        // - S'il y a eu modif et que c'est une URL 

        // 3. Récupération du lien à modifier
        const idlink = req.params.idlien;
        const idx_RandL = idlink.split("_");
        const idx_Rubr = idx_RandL[0];
        const idx_Lien = idx_RandL[1];
        let lienAmodifier = contenuJsonFile.rubriques[idx_Rubr].liens[idx_Lien];        
        //console.log("=> lienAmodifier AVANT modification" + JSON.stringify(lienAmodifier)); //TEST

        const var_tmp = lienAmodifier.cible;
        
        // 4. Manipulation de l'objet du lien :
            // 4.1 Suppression du fichier qui a potentiellement été uploadé pdt cette session (Suppression sur serveur du BackOffice)
        if(lienAmodifier.typeLien_TEMP == "fichier") {
            await deleteLocalFile(req, lienAmodifier.cible_TEMP);       
            console.log("Suppression sur serveur de BO du fichier ds propriété 'cible_TEMP' => " + colors.bgYellow.black(lienAmodifier.cible_TEMP)); //TEST
        } 
            // 4.2 Gestion de la suppression du fichier sur serveur de prod. (Fichier uploadé lors de précédentes sessions: passage de la propriété "cible" dans "FichiersASupprEnProd", si cela n'a pas déjà été fait)   
        if(lienAmodifier.typeLien == "fichier" && data.typeLien !== "-") {
            contenuJsonFile.FichiersASupprEnProd.push(lienAmodifier.cible);         
            console.log("Passage du nom de fichier ds prop. 'cible' à prop. 'FichiersASupprEnProd' pour suppression sur serveur de prod. : " + colors.bgCyan.black(lienAmodifier.cible)); //TEST
        }

        // V1
        lienAmodifier.intitule = data.intitule;
        lienAmodifier.fournisseurs = data.fournisseurs.join(",");
        if(data.typeLien !== "-") { // Si modif a été faite sur l'Hyperlien : Mise à jour de ces données aussi
            lienAmodifier.typeLien = "";
            lienAmodifier.cible = "";
            lienAmodifier.typeLien_TEMP = data.typeLien;
            lienAmodifier.cible_TEMP = data.cible;
        }
        // V2
        /*lienAmodifier = {
            "intitule": data.intitule,
            "typeLien": (data.typeLien !== "-" ? "" : lienAmodifier.typeLien),
            "cible": (data.typeLien !== "-" ? "" : lienAmodifier.cible),
            "fournisseurs": data.fournisseurs.join(","),
            "typeLien_TEMP": (data.typeLien !== "-" ? data.typeLien : lienAmodifier.typeLien_TEMP)
            "cible_TEMP": (data.typeLien !== "-" ? data.cible : lienAmodifier.cible_TEMP)
        };*/
        console.log("Objet JSON 'lienAmodifier' après modification, avant intégration ds JSON global : " + colors.bgWhite.red(JSON.stringify(lienAmodifier))); //TEST

        // 5. Réaffectation du lien modifié ds le JSON et écriture du fichier
        contenuJsonFile.rubriques[idx_Rubr].liens[idx_Lien] = lienAmodifier;
        await modifFile(pathJsonFile, contenuJsonFile); // Modif du fichier avec le JSON modifié

        // 6. Envoi  du template du lien avec les données remplies
        const dataLienModifie = {
            "intitule": data.intitule,
            "fournisseurs": data.fournisseurs.join(","),
            "cible": (data.typeLien !== "-" ? data.cible : var_tmp)
        };
        res.render('templates/lien', { cf: {"liens": [dataLienModifie]}, X: idx_Rubr, idxLien: idx_Lien }, function(err, html) {
            if(err) { 
                if(!err.customMsg) { err.customMsg = "Appel du template lors de la phase d'enregistrement d'une modification de lien"; }
                throw err;
            } 
            res.send(html);
        })

    } catch (err) {
        if(!err.customMsg) { err.customMsg = "Etape d'enregistrement d'une modification de lien"; }
        next(err);
    }
});


router.post('/Actualites/:idcat/moveRubrique', checkAccessUser, async function(req, res, next) {        console.log(colors.bgYellow.black("router.post('/Actualites/:idcat/moveRubrique')")); //TEST
    try {
        const dataBt = JSON.parse(req.body.dataBt);
        const indexRubr = parseInt(dataBt.idx);
        const direction = dataBt.dir;

        // Récupération objet JSON à partir du fichier
        const pathJsonFile = await getPathTEMPJsonFile(req); // Récupération du chemin du fichier '*_TEMP.json'   
        let contenuJsonFile = await readFile(pathJsonFile); // Affectation données du fichier '*_TEMP.json' dans var.      
        

        if((direction === 'up' || direction === 'down') 
        && !(indexRubr === 0 && direction === 'up') 
        && !(indexRubr === contenuJsonFile.rubriques.length && direction === 'down')) {

            const rubriqueToMove = contenuJsonFile.rubriques[indexRubr];
            contenuJsonFile.rubriques.splice(indexRubr, 1); // Retrait de la rubrique du JSON 
            let idxInsertRubr = (direction === 'up' ? indexRubr - 1 : (direction === 'down' ? indexRubr + 1 : null) );  
            console.log("idxInsertRubr => " + idxInsertRubr);//

            let rubriquesNvelOrdre = [];
            for(let i = 0; i < contenuJsonFile.rubriques.length + 1; i++) {
                if(i < idxInsertRubr) {
                    rubriquesNvelOrdre.push(contenuJsonFile.rubriques[i]);
                } else if(i == idxInsertRubr) {
                    rubriquesNvelOrdre.push(rubriqueToMove);
                } else {
                    rubriquesNvelOrdre.push(contenuJsonFile.rubriques[i - 1]);
                }
            }
            contenuJsonFile.rubriques = rubriquesNvelOrdre;
            // Si utilisation de Lodash : Utiliser _.dropWhile, _.dropRightWhile, _.concat

            await modifFile(pathJsonFile, contenuJsonFile); // Modif du fichier avec le nouveau JSON (sans la rubrique donc) 
 
            // Envoi bloc html à la vue principale 'Actualites.ejs' avec le lien supprimé
            res.render('templates/rubrique', { contenuFile: rubriquesNvelOrdre }, function(err, html) {
                if(err) { 
                    if(!err.customMsg) { err.customMsg = "Appel du template de la rubrique suite à déplacement d'une rubrique"; }
                    throw err;
                } 
                res.send(html);
            });

        } else {
            throw {customMsgComplementaire: "Problème dans la data envoyée coté back lors du click (impossibilité de traiter la demande)"};
        }

    } catch (err) {
        if(!err.customMsg) { err.customMsg = "Etape de déplacement d'une rubrique" + (typeof err.customMsgComplementaire !== "undefined" ? " : " + err.customMsgComplementaire : ""); }
        next(err);
    }
});




// Mise en production sur serveur des catalogues
router.get('/Actualites/:idcat/mep', checkAccessUser, async function(req, res, next) {        console.log(colors.bgYellow.black("router.get('/Actualites/:idcat/mep')")); //TEST
    try {
    
        // 0. Récupération des path :
        const role = _.filter(config.get('roles'), function(r) { return r.idCat == req.params.idcat });
        const nomCatShort = role[0].nomCatShort;
        const configPathFiles = config.get('pathFiles');
        const directoryPath = getDirectoryPath(req, role);

        const local_file_json = path.join(directoryPath, "json_" + nomCatShort + ".json");
        //path.join(directoryPath, "json_" + nomCatShort + "_TEMP.json");
        
        // Répertoire local des fichiers uploadés
        const local_dir_uploadedFiles = path.join(
            directoryPath, 
            configPathFiles.local_dir_uploadedFiles
        );
        // Répertoire local pour y archiver le .json qui est en prod. avant écrasement du nouveau
        const local_dir_archives = path.join(
            directoryPath, 
            configPathFiles.local_dir_archives
        );

        // Répertoire de destination du/des fichier(s) pdf sur serveur de Prod (20.10) : A CHANGER POUR LA PROD.
        const prod_dir_uploadedFiles = path.join(
            //directoryPath, 
            configPathFiles.prod_dir_root, 
            configPathFiles.prod_dir_uploadedFiles, 
            nomCatShort
        );
        // Répertoire de destination pour "*.json" sur serveur de Prod (20.10) : A CHANGER POUR LA PROD.
        const prod_file_json = path.join(
            //directoryPath, 
            configPathFiles.prod_dir_root, 
            configPathFiles.prod_dir_jsonFile,
            nomCatShort,
            "json_" + nomCatShort + ".json"
        );

        // Pour fichier "*.json" sur serveur de BO
        // Pour fichier "*_TEMP.json" sur serveur de BO
        const pathTEMPJsonFile = await getPathTEMPJsonFile(req); // Récupération du chemin du fichier '*_TEMP.json'   
        

        
        /*console.log("local_file_json => " + local_file_json); //TEST
        console.log("local_dir_uploadedFiles => " + local_dir_uploadedFiles); //TEST
        console.log("local_dir_archives => " + local_dir_archives); //TEST
        console.log("prod_dir_uploadedFiles => " + prod_dir_uploadedFiles); //TEST
        console.log("prod_file_json => " + prod_file_json); //TEST*/

        // Montage lecteur réseau
        const paramsLR_lettre = config.get('lecteurReseau').lettre;
        const paramsLR_login = config.get('lecteurReseau').login;
        const paramsLR_password = config.get('lecteurReseau').password;
        const PathDrive = await networkDrive.pathToWindowsPath(config.get('pathFiles').prod_dir_root); // pour avoir le path au format Windows
        console.log(colors.bgMagenta.yellow(PathDrive)); //TEST

        // Ici check si lecteur réseau existe pour le path qui nous interesse
        try {
            let driveLetter = await networkDrive.find(PathDrive);
            for(var i = 0; i < driveLetter.length; i++) {
                //if(driveLetter[i] == config.get('lecteurReseau').lettre) { console.log("driveLetter[i] => " + driveLetter[i]); }
                await networkDrive.unmount(driveLetter[i]); // Si existe, on le(s) supprime
                console.log("Suppression de driveLetter[i] => " + driveLetter[i]); //TEST
            }
        } catch (err) {
            console.log("Pas de lecteur réseau => " + err);
        }

        // Montage lecteur réseau
        try {
            await networkDrive.mount(PathDrive, paramsLR_lettre, paramsLR_login, paramsLR_password);        console.log("Montage lecteur réseau : OK"); //TEST 
        } catch (err) {
            if(!err.customMsg) { err.customMsg = "Phase de montage du lecteur réseau pour le transfert des données lors de la mise en ligne" };
            throw err;
        }


        // 1. Récupération du fichier .json du serveur de prod sur le serveur de BO, 
        // en le renommant au niveau du back office avec la date du jour --> permet d'avoir un historique en cas de pb !!
        const d = new Date;
        const dateJour = [
            d.getFullYear(),
            ("0" + (d.getMonth()+1)).slice(-2),
            ("0" + d.getDate()).slice(-2)].join('-') + 
            "_" +
            [("0" + d.getHours()).slice(-2) + "h",
            ("0" + d.getMinutes()).slice(-2) + "mn",
            ("0" + d.getSeconds()).slice(-2) + "s"].join('');

        try {
            await fse.copy(
                prod_file_json, 
                path.join(local_dir_archives, dateJour + "_json_" + nomCatShort + ".json")
            );
            console.log("Copie du JSON de prod à BO pour archive : OK"); //TEST
        } catch (err) {
            if(!err.customMsg) { err.customMsg = "Phase de récupération à partir du serveur de prod. du '.json' pour archivage sur serveur du backoffice" };
            throw err;
        }


        let contenuJsonFile = await readFile(pathTEMPJsonFile);
        
        let filesToSendToProd = [];
        contenuJsonFile.rubriques.forEach(r => {
            r.liens.forEach(l => {
                // 2. Constitution liste des fichiers .pdf à mettre en prod.
                if(l.typeLien_TEMP === "fichier") { filesToSendToProd.push(l.cible_TEMP); }
                
                // 3. Si "typeLien_TEMP" et "cible_TEMP" sont remplis, déplacer leurs valeurs ds les propriétés "typeLien" et "cible" du même lien...
                if(l.typeLien_TEMP !== "" && l.cible_TEMP !== "") { 
                    l.typeLien = l.typeLien_TEMP;
                    l.cible = l.cible_TEMP;
                }

                // ...Suppression propriétés "typeLien_TEMP" et "cible_TEMP"
                delete l.typeLien_TEMP;
                delete l.cible_TEMP;
            })
        });
        console.log("filesToSendToProd : " + filesToSendToProd.join(", ")); //TEST
        console.log(colors.bgWhite.blue(JSON.stringify(contenuJsonFile))); //TEST
            
        
        // 4. Déplacement du/des fichier(s) du rep. local "tempoUploads" vers serveur de prod, et écrasement fichier si déjà présent sur serveur de Prod.
        try {
            // 'Promise.all()' attend que l'ensemble des promesses soient tenues => Executions en parallèle
            await Promise.all(filesToSendToProd.map(async f => {
                await fse.move(path.join(local_dir_uploadedFiles, f), path.join(prod_dir_uploadedFiles, f), true);
            }));
            console.log("Copie des PDF de BO vers Prod : OK"); //TEST
        } catch (err) {
            if(!err.customMsg) { err.customMsg = "Phase de copie du/des fichier(s) uploadés vers le serveur de prod." }
            throw err;
        }

        // 5. Suppression des fichiers à supprimer sur serveur de prod
        console.log(colors.bgCyan.yellow(contenuJsonFile.FichiersASupprEnProd)); //TEST
        let lstMissingFilesOnProd = [];
        if(typeof contenuJsonFile.FichiersASupprEnProd !== "undefined") {
            try {
                await Promise.all(contenuJsonFile.FichiersASupprEnProd.map(async f => {
                    let path_prodUploadFile = path.join(prod_dir_uploadedFiles, f);     console.log("path_prodUploadFile : " + path_prodUploadFile); //TEST

                    // Check ici si Path existe pour pouvoir avertir qu'un ou des fichiers sur serveur de prod. n'était pas présent
                    const exist = await fse.pathExists(path_prodUploadFile); // Check si fichier existe
                    if(!exist) { lstMissingFilesOnProd.push(f); }

                    await fse.remove(path_prodUploadFile); // Suppr. fichier : // async/await est-il indispensable dans ce '¨Promise.all()' ?
                }));
                console.log("Suppression des PDF en Prod : OK"); //TEST
            } catch (err) {
                if(!err.customMsg) { err.customMsg = "Phase de suppression sur serveur de prod. du/des fichier(s) des liens supprimés dans le backoffice" }
                throw err;
            }
        }

        // 6. Retrait de la propriété "FichiersASupprEnProd" ds le fichier .json avant mise en prod
        delete contenuJsonFile.FichiersASupprEnProd;
        // 7. Modif du fichier '*_TEMP.json' avec le JSON modifié
        await modifFile(pathTEMPJsonFile, contenuJsonFile); 
        console.log("Ecriture JSON retravaillé ds fichier JSON : OK"); //TEST

        // 8. On renomme le "*_TEMP.json" en "*.json" ce qui écrase le précédent "*.json",
        // puis on supprime le "*_TEMP.json"
        try {
            await fse.copy(pathTEMPJsonFile, local_file_json);
            await fse.remove(pathTEMPJsonFile);
            console.log("Renommage '*_TEMP.json' en '*.json', puis suppression du '*_TEMP.json' : OK"); //TEST
        } catch (err) {
            if(!err.customMsg) { err.customMsg = "Renommage sur serveur du backoffice du fichier '*_TEMP.json' en '*.json' (ce qui écrase le précédent '*.json')" };
            throw err;
        }

        // 9. Copie du nouveau "*.json" vers serveur de prod.
        try {
            await fse.copy(local_file_json, prod_file_json);
            console.log("Copie nouveau '*.json' vers Prod : OK"); //TEST
        } catch (err) {
            if(!err.customMsg) { err.customMsg = "Copie du '*.json' mis à jour, du serveur du backoffice vers serveur de prod." };
            throw err;
        }

        // S'assurer que le rép.'tempoUploads' est vide ??? (méthode 'fse.emptyDir')
        // =>> A FAIRE


        // Démontage du lecteur réseau utilisé pour le transfert des données lors de la mise en ligne
        try {
            await networkDrive.unmount(paramsLR_lettre);  console.log('Le networkDrive est démonté'); //TEST
        } catch (err) {
            if(!err.customMsg) { err.customMsg = "Démontage du lecteur réseau utilisé pour le transfert des données lors de la mise en ligne" };
            throw err;
        }


        res.send({ ok: true, missingFilesOnProd: lstMissingFilesOnProd });

    } catch (err) {
        if(!err.customMsg) { err.customMsg = "Etape de mise en ligne"; }
        next(err);
    }

});


module.exports = router;



// Pour obtenir la data du fichier '_TEMP.json', et si n'existe pas, on créé le fichier '_TEMP.json'
async function getPathTEMPJsonFile(req) {       console.log(colors.bgYellow.black("async function getPathTEMPJsonFile(req)")); //TEST
    try {
        const role = _.filter(config.get('roles'), function(r) { return r.idCat == req.params.idcat });
        const directoryPath = getDirectoryPath(req, role);
        const nomCatShort = role[0].nomCatShort;
        
        const isTempFileExists = await CheckTempFileExist(directoryPath, nomCatShort);
        if (!isTempFileExists) { await CreateTempFile(directoryPath, nomCatShort) } // Si pas de fichier '*_TEMP.json', création de celui-ci
        return path.join(directoryPath, "json_" + nomCatShort + "_TEMP.json");
        
    } catch (err) {
        if(!err.customMsg) { err.customMsg = "Phase de récupération du contenu du fichier '*_TEMP.json'" }
        throw err;
    }
}



// Lecture du fichier .json
async function readFile(pathFile) {         console.log(colors.bgYellow.black("async function readFile(pathFile)")); //TEST
    try {
        // Optionnel : Test si présence du fichier .json. Si pas présent, execution de la ligne ci-dessous puis écriture dedans pour ne pas qu'il y ait bug ( => [{"rubrique": "", "liens":[]}] )
        await fse.ensureFile(pathFile); // Check si le fichier ou les répertoires en amont existent
        return await fse.readJson(pathFile); // lecture du fichier
    } catch (err) {
        if(!err.customMsg) { err.customMsg = "Phase de lecture du fichier .json" }
        throw err;
    }
}

// Modification du fichier .json
async function modifFile(pathFile, data) {          console.log(colors.bgYellow.black("async function modifFile(pathFile, data)")); //TEST
    try {
        // Réécriture fichier .json
        fse.writeJson(pathFile, data, err => {
            if(err) throw err;
            return;
        })
    } catch (err) {
        if(!err.customMsg) { err.customMsg = "Phase de modification du fichier .json" }
        throw err;
    }
}

// Check si existence du fichier '*.json'
async function CheckJSONFileExist(directoryPath, nomCatShort) {         console.log(colors.bgYellow.black("async function CheckJSONFileExist(directoryPath, nomCatShort)")); //TEST
    const IsFileExists = await fse.pathExists(path.join(directoryPath, "json_" + nomCatShort + ".json"));
    if(!IsFileExists) {     // Si n'existe pas...
        try {
            fse.writeFile(
                path.join(directoryPath, "json_" + nomCatShort + ".json"), 
                JSON.stringify({rubriques: []})
            ); 
        } catch (err) {
            if(!err.customMsg) { err.customMsg = "Création du fichier .json suite à détection d'absence de ce fichier" }
            throw err;
        }

    }
}


// Check si existence du fichier '*_TEMP.json'
async function CheckTempFileExist(directoryPath, nomCatShort) {         console.log(colors.bgYellow.black("async function CheckTempFileExist(directoryPath, nomCatShort)")); //TEST
    try {
        const pathJsonFile = path.join(directoryPath, "json_" + nomCatShort + "_TEMP.json"); // Pour obtenir le path pour lire/écrire le fichier .json 
        return await fse.pathExists(pathJsonFile);
    } catch(err) {
        if(!err.customMsg) { err.customMsg = "Phase de vérification de la présence ou pas du fichier .json temporaire" }
        throw err;
    }
}

// Création du fichier '*_TEMP.json'
async function CreateTempFile(directoryPath, nomCatShort) {         console.log(colors.bgYellow.black("async function CreateTempFile(directoryPath, nomCatShort)")); //TEST
    try {
        const pathJsonFile = path.join(directoryPath, "json_" + nomCatShort + ".json"); // Pour obtenir le path pour lire/écrire le fichier .json   
        let objectFromJson = await fse.readJson(pathJsonFile);
        // Ajout propriétés
        //objectFromJson.FichierUploadeEnCours = "";
        objectFromJson.FichiersASupprEnProd = [];

        objectFromJson.rubriques.forEach(function(rubr){
            rubr.liens.forEach(function(lien) {
                lien.typeLien_TEMP = "";
                lien.cible_TEMP = "";
            })
        });

        // Création fichier '*_TEMP.json'
        return await fse.writeJson(path.join(directoryPath, "json_" + nomCatShort + "_TEMP.json"), objectFromJson);
    } catch(err) {
        if(!err.customMsg) { err.customMsg = "Phase de création du fichier .json temporaire" }
        throw err;
    }
}


// Suppression d'un fichier uploadé au cours de la session (donc situé sur serveur du backoffice)
async function deleteLocalFile(req, fileName) {
    try {
        const role = _.filter(config.get('roles'), function(r) { return r.idCat == req.params.idcat });
        const uploadedFilesDirectory = config.get('pathFiles').local_dir_uploadedFiles;
        const pathJsonFile = path.join(getDirectoryPath(req, role), uploadedFilesDirectory, fileName); // Voir pour faire app.use pour avoir tt le temps les données du config
        await fse.remove(pathJsonFile);   
    } catch (err) {
        if(!err.customMsg) { err.customMsg = "Phase de suppression d'un fichier uploadé lors de la même session" }
        throw err;
    }
}



const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}


/// pour obtenir le path du répertoire racine ou se trouvent les fichiers à lire/écrire/supprimer
function getDirectoryPath(req, role) {            console.log(colors.bgYellow.black("function getDirectoryPath(req)")); //TEST
    try {
        let routePath = req.route.path;
        routePath = routePath.substring(routePath.indexOf('/') + 1);
        let routeFirstParam = routePath.split("/")[0];

        let filesPathConfig = config.get('pathFiles.local_dir_root');

        return path.join(
            appRoot, 
            filesPathConfig, 
            routeFirstParam, 
            role[0].nomCatShort
        );

    } catch (err) {
        if(!err.customMsg) { err.customMsg = "Fonction pour obtenir le répertoire racine ou se trouvent les fichiers à lire/écrire/supprimer"; }
        throw err;
    }
}



// Pour obtenir la liste des fnrs qui sera affichée dans un select lors d'un ajout de rubrique/lien
async function getListeFournisseurs(idCat) {              console.log(colors.bgYellow.black("async function getListeFournisseurs(reqPath)")); //TEST
    try {
        let requete = "\
        SELECT distinct f.CFRCAHP, f.DFRABREGE \
        FROM ARTICLES.dbo.FOURNISSEURS f inner join ARTICLES.dbo.CATALOGUE c on f.cat=c.cat "
        if(idCat == "55") { // Au cas ou cat. Nutri
            requete += "and IDC='5' inner join TARIF t on f.CFRCAHP=t.CFR inner join ARTICLE_CATALOGUE a on t.IDT=a.IDT and para=1 "
        } else {
            requete += "and IDC=" + idCat
        }
        requete += " WHERE NONVISBLESITEEXTRANET Is null And FRINACTIF Is null \
        order by f.DFRABREGE \
        ";

        return await connectToBdd(requete);
    } catch(err) {
        if(!err.customMsg) { err.customMsg = "Requete SQL pour obtenir la liste des fournisseurs"; }
        throw err;
    }

}


