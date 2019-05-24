/*var body = null;
var masque = null;
var idcat = null,
    ClassAjoutRubrique = null,
    CreateNewRubrique = false;
var filerKit = null;
var IdxRubrNvLien = null;

var DataFichierJson = null; // Changer le nom de la variable
*/


/// Juste avant fermeture de la fenetre, affectation sessionStorage qui sera lisible en cas de reload (permet de détecter un reload). 
/// Utile pour affichage de l'encart signalant qu'une modif a été faite lors d'une précédente visite, sans qu'il y ait eu mise en ligne
window.onbeforeunload = function () {
    if (sessionStorage.getItem('Reloaded') == null) {
        sessionStorage.setItem('Reloaded', true);
    }
}

$(function () {
    body = $('body');
    body.append("<div class='Popin Hidden'></div><div class='masque Hidden'></div>"); /// Insertion du masque gris transparent dans le DOM
    
    masque = $('.masque');
    Popin = $('.Popin');
    ClassAjoutRubrique = $('.ClassAjoutRubrique');
    DataFichierJson = {};
    CreateNewRubrique = false;

    ToucheF5(); // Pour éviter reload de page

    SetLinksSortable(); // Pour pouvoir changer l'ordre des liens avec du Drag&drop

    /// Pour obtenir l'idcat
    var pn = window.location.pathname;
    idcat = pn.substring(pn.lastIndexOf("/") + 1, pn.length);


    /// Pour fermeture masque et popin
    Popin.on("click", ".ClosePopin", function () {
        Popin.empty().addClass('Hidden');
        masque.addClass('Hidden');
    });

    
    /// Affichage de la popin annonçant venue précédente sur ce backoffice sans mise en ligne
    if(($("#TempFile").text() === "true") && (sessionStorage.getItem('Reloaded') == null)) {
        masque.removeClass('Hidden');
        Popin.removeClass('Hidden').html("Vous vous êtes rendu dernièrement sur ce back office sans avoir cliqué sur le bouton 'Mettre en ligne'.<br />Peut-être avez-vous fait des modifications sans mettre en production par la suite.<button class='ClosePopin'>OK</button>");
    }

    body.on('click', '.divCentralIndex a',function(e){ e.preventDefault(); }); // Liens rendus inactifs

    /// Evenements sur boutons liés aux rubriques et liens
    body
        .on('click', '.ClassAjoutRubrique', function() { AddRubrique(); })
        .on('click', '.ClassModRubrique', function() { ModifLibelleRubrique($(this)); }) // <= A REFAIRE COTE BACK !!
        .on('click', '.ClassSupprRubrique', function() { DeleteRubrique($(this)); })
        .on('click', '.ClassAnnulRubrique', function() { CancelModifRubrique($(this)); })
        .on('click', '.ClassEnrRubrique', function() { RecordModifLibelleRubrique($(this)); }) // <= A REFAIRE COTE BACK !!

        .on('click', '.ClassAjoutLien', function() { AddLink($(this)); })
        .on('click', '.ClassModLien', function() { GetInterfaceSaisieModifLien($(this)); })
        .on('click', '.ClassSupprLien', function() { DeleteLink($(this)); })
        .on('click', '.ClassAnnulLien', function() { CancelInterfaceSaisie($(this)); })
        .on('click', '.ClassEnrLien', function() { RecordModifLink($(this)); });


    /// gestion boutons création liens/rubrique
    body
        .on('click', '[data-event="add"] #Bt_LienFichier', function() { GetInterfaceSaisieAjout('Fichier'); })
        .on('click', '[data-event="add"] #Bt_LienWeb', function() { GetInterfaceSaisieAjout('Web'); })
        .on('click', '#Bt_Cancel', function() { CancelInterfaceSaisie(); })
        .on('click', '#Bt_Record', function() { RecordAjout($(this)); })

        .on('click', '#BtChxModifCible', function() { ChoixTypeHyperlien("modif"); })
        .on('click', '[data-event="modif"] #Bt_LienFichier', function() { ModifCible('Fichier'); })
        .on('click', '[data-event="modif"] #Bt_LienWeb', function() { ModifCible('Web'); })
        
        .on('click', 'button#SubmitMiseEnLigne', function() { MiseEnLigne(); })
        //.on('click', '.WrapperLinkInputs select', function() { return $(this).val() }); <= Inutile
});


/// Pour création de l'interface de saisie lors de la phase de création de lien ou de rubrique
function GetInterfaceSaisieAjout(typeLien) {
    // Disparition encart et masque
    $('#EncartChoixTypelien').remove();
    masque.addClass('Hidden');

    // Chargement html pour faire apparaitre les champs de saisie
    // pour une nouvelle Rubrique :
    if(CreateNewRubrique) {

        $.ajax({
            type: "GET",
            url: "/Actualites/"+ idcat + "/newRubrique/" + typeLien,
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            beforeSend: function () { masque.removeClass('Hidden'); }
        }).done(function(data) {
            ClassAjoutRubrique.after("<div id='NewBlockRubrique'></div>").next('div').html(data); // Intégration html pour bloc nvelle rubrique
            if(typeLien === "Fichier") { ParametrageUploadFile($('#NewBlockRubrique input[type="file"]')); } // Paramétrage de l'upload file
            masque.addClass('Hidden');
        })
        .fail(function(err) { 
            console.error(err);
            DisplayError(err.responseText);
        });

    } else { // Pour ajout nouveau lien :

        $.ajax({
            type: "GET",
            url: "/Actualites/"+ idcat + "/newLink/" + typeLien,
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            beforeSend: function () { masque.removeClass('Hidden'); }
        }).done(function(data) {

            if(typeof IdxRubrNvLien === "number") { // Check si var est présente
                var goodRubrique = $("[data-type='rubrique']").eq(IdxRubrNvLien);
                
                /* V1 *///goodRubrique.find("button.ClassAjoutLien").after("<div></div>").next('div').html(data); // Insert ds un div créé à cette occasion, après bt 'ClassAjoutLien'
                //$('#DivNewLink').unwrap(); // Retrait du div parent qui contient le html, sans supprimer le html

                /* V1 */goodRubrique.find("button.ClassAjoutLien").after("<div id='NewBlocklien'></div>").next('div').html(data); // Insert ds un div créé à cette occasion, après bt 'ClassAjoutLien'
                if(typeLien === "Fichier") { ParametrageUploadFile($('#NewBlocklien input[type="file"]')); } // Paramétrage de l'upload file
                masque.addClass('Hidden');
            } else {
                throw {customMsg: "L'id de la rubrique dans laquelle doit être inséré le bloc 'Ajout de lien' n'a pas été identifié" };
            }
        })
        .fail(function(err) { 
            console.error(err); 
            DisplayError(err.responseText);
        });

    }

}


/// Click 'Annuler' : Suppression du bloc de saisies
function CancelInterfaceSaisie() {
    var r = confirm("Voulez-vous annuler les modifications ?");
    if (r == true) {
        if(CreateNewRubrique) { // Cas ou block 'Ajout d'une rubrique'...
            $('#NewBlockRubrique').remove();
            CreateNewRubrique = false;
        } else if($('#NewBlocklien').length > 0) { // ...Sinon cas ou bloc création d'un lien...
            $('#NewBlocklien').remove();
            IdxRubrNvLien = null;
        } else if($("#ModifBlocklien".length > 0)) { // ...Sinon cas ou modification de lien déjà existant
            // On cache et on affiche les bons éléments pour avoir l'interface de saisie
            bt = CancelInterfaceSaisie.arguments[0];
            var blocLien = bt.closest('div[data-type="lien"]');
            blocLien.find('a, .ClassModLien, .ClassSupprLien').removeClass('Hidden');
            blocLien.find('.WrapperLinkInputs').remove();
        }

        // Suppression du doc uploadé s'il y en a eu un lors de la création de block juste avant son annulation
        if(typeof DataFichierJson.FichierUploadeEnCours !== "undefined") { localFileToDelete(); }

        SortableDisableOrNot('enable');	// Changement d'ordre des liens à nouveau impossible + retrait propriété 'disabled' sur boutons 
    }
}


/// Click 'Enregistrer' : Enregistrement des données saisies lorsque nouvelle rubrique et/ou nouveau lien
function RecordAjout(bt) {
    var r = confirm('Voulez-vous enregistrer les modifications ?');
    if (r == true) {
        // On détermine de quel type d'enregistrement il s'agit
        var IsNewRubrique = $("#NewBlockRubrique").length > 0 ? true : false; // Création de rubrique
        var IsNewLien = $('#DivNewLink').length > 0 ? true : false; // Création de lien

        // Cas d'une nouvelle rubrique ou juste un nouveau lien ds une rubrique existante
        if(IsNewLien) {
            var lienModel = null;
            var rubriqueModel = null;

            try {
                // Cas d'une nouvelle rubrique
                if(IsNewRubrique) {
                    var champNewRubrique = $('#NewBlockRubrique #ChpNew_rubrique');
                    var val_inputRubrique = $.trim(champNewRubrique.val());
                    if(val_inputRubrique === "") { 
                        champNewRubrique.addClass('error'); 
                        throw new Error("Vous devez remplir tous les champs pour pouvoir valider! XX");
                    }
                }

                // Passage de l'index de la rubrique
                var idRubr = $('[data-type="rubrique"]').index(bt.closest('[data-type="rubrique"]'));
                
                lienModel = GetDataBlocSaisieLien(bt);
                rubriqueModel = {
                    "idRubrique": idRubr,
                    "intituleRubrique": val_inputRubrique,
                    "lienRubrique": lienModel
                }
            } catch (err) {
                alert(err.message);
                return false;
            }

        }

        //console.log("rubriqueModel => "); console.log(JSON.stringify(rubriqueModel)); //TEST
        
        // Enregistrement JSON final
        $.ajax({
            type: "POST",
            url: "/Actualites/"+ idcat + "/recordDataNewRubriqueOrLink",
            data: {newElement: JSON.stringify(rubriqueModel) },
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            beforeSend: function () { masque.removeClass('Hidden'); }
        }).done(function(data) {
            var NewBlockRubrique = $("#NewBlockRubrique");
            if(NewBlockRubrique.length > 0) { NewBlockRubrique.remove(); } // Suppression interface de saisie
              
            ClassAjoutRubrique.next('div').html(data); // Intégration html
            SetLinksSortable(); // On rend les liens de la rubrique 'sortable', car on a écrasé les anciens liens
            masque.addClass('Hidden');
            SortableDisableOrNot('enable');	// Changement d'ordre des liens à nouveau possible + retrait propriété 'disabled' sur boutons  
        })
        .fail(function(err) { 
            console.error(err); 
            //DisplayError_V2(Popin, err); // <= version avec renvoi de l'erreur au format JSON (voir fichier serveur 'erreur.js')
            DisplayError(err.responseText);
        });

    }
}


function GetDataBlocSaisieLien(bt) {
    var erreur = false;

    // Récup valeur champs de saisie et check si vide ou pas
    var blockInputs = bt.closest('.WrapperLinkInputs');

    var champIntituleLien = blockInputs.find('input[type="text"]#ChampIntituleLien');
    var val_intituleLien = $.trim(champIntituleLien.val());
    if(val_intituleLien === "") { champIntituleLien.addClass('error'); erreur = true; }

    var lstFnrs = blockInputs.find('select').val();
    
    var uploadOrURL = null;

    var inputFileHyperlien = blockInputs.find("input[type='file']");
    if(inputFileHyperlien.length > 0) { // Si présence de l'upload file
        uploadOrURL = "fichier";
        if(typeof DataFichierJson.FichierUploadeEnCours === "undefined") {
            $(".jFiler-input-dragDrop").addClass('error'); erreur = true;
        }
    }

    var champHyperlien = blockInputs.find('input[type="text"]#ChampHyperlien');
    if(champHyperlien.length > 0) { // Si présence du champ de saisie pour URL
        uploadOrURL = "URL";
        var val_hyperlien = $.trim(champHyperlien.val());
        if(val_hyperlien === "") { champHyperlien.addClass('error'); erreur = true; }
    }

    // Cas de modif de lien, qd hyperlien n'est pas modifié
    var champHyperlien_Mod = blockInputs.find('input[type="text"]#ChampHyperlien_Mod');
    if(champHyperlien_Mod.length > 0) { // Si présence du champ d'affichage de l'Hyperlien pour modification
        uploadOrURL = "-";
        var val_hyperlien = $.trim(champHyperlien_Mod.val());
        if(val_hyperlien === "") { champHyperlien_Mod.addClass('error'); erreur = true; }
    }
    
    // Alert si champ(s) pas rempli
    if(erreur === true) {   
        throw new Error("Vous devez remplir tous les champs pour pouvoir valider!");
    }

    return {
        "intitule": val_intituleLien,
        "typeLien": uploadOrURL,
        "cible": (uploadOrURL === "fichier" ? DataFichierJson.FichierUploadeEnCours : (uploadOrURL === "URL" ? val_hyperlien : "")),
        "fournisseurs": (lstFnrs === null ? [] : lstFnrs)
    }
}




///== Partie Rubriques et liens ==///
function AddRubrique() {
    SortableDisableOrNot('disable'); // On rend le changement d'ordre des liens impossible + ajout prop. des boutons en disabled
    CreateNewRubrique = true;
    ChoixTypeHyperlien("add");
}

function AddLink(bt) {
    SortableDisableOrNot('disable'); // On rend le changement d'ordre des liens impossible + ajout prop. des boutons en disabled
    IdxRubrNvLien = $("[data-type='rubrique']").index(bt.closest("[data-type='rubrique']")); // Identification de la rubrique dans laquelle est ajouté un lien
    ChoixTypeHyperlien("add");
}





function ModifLibelleRubrique(bt) { 
    // Changement d'ordre des liens rendu impossible + ajout prop. des boutons en disabled
    SortableDisableOrNot('disable');
    
    // On cache et on affiche les bons éléments pour avoir l'interface de saisie
    var blocRubrique = bt.closest('div[data-type="rubrique"]');
    blocRubrique.find('.TitreBandeau .Intitule, .ClassModRubrique, .ClassSupprRubrique').addClass('Hidden');
    blocRubrique.find('.ClassAnnulRubrique, .ClassEnrRubrique').removeClass('Hidden').prop('disabled', false); // Ici, boutons rendus actifs
    blocRubrique.find('.TitreBandeau').prepend('<input id="ModifLibelleRubrique" type="text" value="' + htmlEntities(blocRubrique.find('.TitreBandeau .Intitule').text())  + '" />');
 }
  // Pour permettre d'injecter tout type de caractères (spécialement les double-quote) dans un attribut html
  function htmlEntities(mystring) {
    return mystring.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
 }


// Pour obtenir l'interface de saisie pour modif. de lien
function GetInterfaceSaisieModifLien(bt) {
    SortableDisableOrNot('disable'); // Changement d'ordre des liens rendu impossible + ajout prop. des boutons en disabled
    
    if(typeof DataFichierJson.FichierUploadeEnCours !== "undefined") { delete DataFichierJson.FichierUploadeEnCours }; // Réinitialisation

    var blocLien = bt.closest('div[data-type="lien"]');
    var baliseLien = blocLien.find('a');
    baliseLien.addClass('Hidden');
    blocLien.find('button').addClass('Hidden');
    // Récup des données et alimentation champs de saisie :
    var dataLienAmodifier = {
        "intituleLien": baliseLien.text(),   
        "listeFnrs": blocLien.attr("data-fnrs").split(","),
        "hrefLien": baliseLien.attr('href')
    };

    var htmlLien = blocLien.html();

    // Ajout HTML pour interface de saisie de modif de lien
    $.ajax({
        type: "POST",
        url: "/Actualites/"+ idcat + "/modifLink",    
        data: { dataLinkToMod: JSON.stringify(dataLienAmodifier) },
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        beforeSend: function () { masque.removeClass('Hidden'); }
    }).done(function(data) {
        blocLien.html(htmlLien + data); // Insert du DOM ds le lien    
        masque.addClass('Hidden');
    })
    .fail(function(err) { 
        console.error(err); 
        DisplayError(err.responseText);
    });
}

function ModifCible(typeLien) {
    $.ajax({
        type: "GET",
        url: "/Actualites/"+ idcat + "/modifLink/" + typeLien,
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        beforeSend: function () { masque.removeClass('Hidden'); }
    }).done(function(data) {
        var inputHyperLien = $('#inputHyperLien');
        inputHyperLien.empty().html(data); // Remplacement du champ input par le bon
        if(typeLien === "Fichier") { ParametrageUploadFile(inputHyperLien.find('input[type="file"]')); } // Paramétrage de l'upload file

        // Disparition encart et masque
        $('#EncartChoixTypelien').remove();
        masque.addClass('Hidden');
    })
    .fail(function(err) { 
        console.error(err);
        DisplayError(err.responseText);
    });
}


function CancelModifRubrique(bt) {
    var r = confirm("Voulez-vous annuler les modifications ?");
    if (r == true) {
        // On cache et on affiche les bons éléments pour avoir l'affichage par défaut
        var blocRubrique = bt.closest('div[data-type="rubrique"]');
        blocRubrique.find('.TitreBandeau .Intitule, .ClassModRubrique, .ClassSupprRubrique').removeClass('Hidden');
        blocRubrique.find('.ClassAnnulRubrique, .ClassEnrRubrique').addClass('Hidden');
        blocRubrique.find('#ModifLibelleRubrique').remove();    

        // Changement d'ordre des liens à nouveau possible + retrait propriété 'disabled' sur boutons 
        SortableDisableOrNot('enable');
    }
 }




// Suppression d'une rubrique
function DeleteRubrique(bt) { 
    var idRubrique = $('[data-type="rubrique"]').index(bt.closest('[data-type="rubrique"]'));
    var r = confirm("Confirmez la suppression de la rubrique svp!");
    if (r == true) {
        DeleteCall({element: "rubrique", id: idRubrique});
    }
}

// Suppression d'un lien (ou d'une rubrique si dernier lien de la rubr.)
function DeleteLink(bt) { 
    var nbLiensDsRubrique = bt.closest('.NewsAccueil').find('div[data-type="lien"]').length;
    // Test pour déterminer si dernier lien de la rubrique, auquel cas suppression de la rubr., sinon simple suppression de lien
    if(nbLiensDsRubrique === 1) { // Si dernier lien de la rubr...
        var r = confirm("En supprimant le dernier lien vous supprimerez sa rubrique;\nSouhaitez-vous confirmer ce choix!");
        if (r == true) {
            var idRubrique = $('[data-type="rubrique"]').index(bt.closest('[data-type="rubrique"]'));
            DeleteCall({element: "rubrique", id: idRubrique});
        }
    } else { // ...sinon...
        var r = confirm("Confirmez la suppression du lien svp!");
        if (r == true) {
            var idLien = bt.closest('div[data-type="lien"]').attr("id");
            DeleteCall({element: "lien", id: idLien});
        }
    }
}

function DeleteCall(data) {
    var element = data.element;
    $.ajax({
        type: "POST",
        url: "/Actualites/"+ idcat + (element === "rubrique" ? "/deleteRubrique/" : (element === "lien" ? "/deleteLink/" : "")) + data.id,
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        beforeSend: function () { masque.removeClass('Hidden'); }
    }).done(function(data) {
        ClassAjoutRubrique.next('div').html(data); // Intégration html pour bloc nvelle rubrique
        SetLinksSortable(); // On rend les liens de la rubrique 'sortable', car on a écrasé les anciens liens
        masque.addClass('Hidden');
    })
    .fail(function(err) { 
        console.error(err); 
        DisplayError(err.responseText);
    });
}




// Modification du libellé d'une rubrique déjà existante
function RecordModifLibelleRubrique(bt) {
    var blocRubrique = bt.closest('[data-type="rubrique"]');
    var idRubrique = $('[data-type="rubrique"]').index(blocRubrique);
    var intituleRubrique = blocRubrique.find('input#ModifLibelleRubrique').val();

    // Enregistrement de la modif 
    $.ajax({
        type: "POST",
        url: "/Actualites/"+ idcat + "/recordLibelleRubrique/" + idRubrique,
        data: { libelleRubrique: intituleRubrique }, // <= Voir si on utilise 'encodeURIComponent'
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        beforeSend: function () { masque.removeClass('Hidden'); }
    }).done(function(data) {
        blocRubrique.find('.TitreBandeau .Intitule').text(data.nvLibelle); // <= Voir si on utilise 'decodeURIComponent'

        //== Comme ds fct° 'CancelModifRubrique' ==//
        blocRubrique.find('.TitreBandeau .Intitule, .ClassModRubrique, .ClassSupprRubrique').removeClass('Hidden');
        blocRubrique.find('.ClassAnnulRubrique, .ClassEnrRubrique').addClass('Hidden');
        blocRubrique.find('#ModifLibelleRubrique').remove();  
        // Changement d'ordre des liens à nouveau possible + retrait propriété 'disabled' sur boutons 
        SortableDisableOrNot('enable');
        //== FIN ==//
        
        masque.addClass('Hidden');
    })
    .fail(function(err) { 
        console.error(err); 
        DisplayError(err.responseText);
    });
}


// Enregistrement de modif(s) de lien existant
function RecordModifLink(bt) {
    var lien = bt.closest('[data-type="lien"]');
    var idlien = lien.attr('id');
    
    try {
        var lienModel = GetDataBlocSaisieLien(bt);   console.log(lienModel); //TEST
    } catch (err) {
        alert(err.message);
        return false;
    }

     $.ajax({
        type: "POST",
        url: "/Actualites/"+ idcat + "/recordDataModifLink/" + idlien,
        data: {newElement: JSON.stringify(lienModel) },
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        beforeSend: function () { masque.removeClass('Hidden'); }
    }).done(function(data) {
        lien.replaceWith(data); // Remplacement de la balise DOM du lien 
        SetLinksSortable(); // On rend les liens de la rubrique 'sortable', car on a écrasé l'ancien lien
        SortableDisableOrNot('enable');	// Changement d'ordre des liens à nouveau possible + retrait propriété 'disabled' sur boutons  
        masque.addClass('Hidden');
    })
    .fail(function(err) { 
        console.error(err); 
        DisplayError(err.responseText);
    });
}
///== FIN Partie Rubriques et liens ==///







function ChoixTypeHyperlien(typeMAJ) {
    masque.removeClass('Hidden'); // Affichage masque
    
    // Création de l'encart donnant le choix d'hyperlien
    body.append("\
        <div id='EncartChoixTypelien' data-event='" + typeMAJ + "'" + ">\
            <div>" + (CreateNewRubrique ? "Vous ne pouvez créer<br/> de rubrique sans lien.<br/>Ce" :"Le") + " lien doit-il donc pointer sur</div>\
            <span id='Bt_LienFichier'>Un fichier</span>\
            <span id='Bt_LienWeb'>Un site Web</span> \
        </div>\
    ");
}


// Pour changement d'ordre de liens
function GetSerialize(DivSortable) {   
    $.ajax({
        type: "POST",
        url: "/Actualites/"+ idcat + "/chgmtordreliens",
        data: { OrderLinks: JSON.stringify($(DivSortable).sortable("toArray")) },
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        //dataType: "json", // Valable si seulement renvoi de JSON
        beforeSend: function () { masque.removeClass('Hidden'); }
    }).done(function(data) {
        // AVEC res.send du coté de la route : On remplace le contenu des liens de la rubrique pour les nouveaux liens reçus
        /*data.linksNewOrder.forEach(link => {
            console.log(link); //TEST
        });*/

        // AVEC res.render du coté de la route
        // Récupération de l'index de la rubrique dont l'ordre des liens est modifié
        var idRubrique = $(DivSortable).closest('[data-type="rubrique"]').attr('id');

        $('[data-type="rubrique"][id="' + idRubrique + '"]').html(data); // Remplacement de ts les liens existants par le html reçu du coté back correspondant à ces m^mes liens mais avec des id modifiés

        // On rend les liens de la rubrique 'sortable', car on a écrasé les anciens liens
        SetLinksSortable();
        masque.addClass('Hidden');
    })
    .fail(function(err) { 
        console.error(err);
        DisplayError(err.responseText);
    });
}


// Rend possible ou non le changement d'ordre des liens + propriété des boutons mis en disabled ou pas
function SortableDisableOrNot(varDispOrNot) {
    $(".NewsAccueil").sortable(varDispOrNot); // Liens rendus 'sortable' ou non
    $('.Grip')[varDispOrNot == 'disable' ? 'addClass' : 'removeClass']('disabled'); //Coloration icones sortable
    $('button').prop('disabled', (varDispOrNot == 'disable' ? true : false)); // Bts mis en disabled ou pas
}


/// A FAIRE : Création de l'encart signalant l'upload d'un fichier trop lourd ou pas au bon format : VIENT DE L'ANCIENNE VERSION => VOIR SI UTILE !!
function CreationEncartUpload() {
}


// Paramétrage de l'upload file avec l'interface Drag & Drop
function ParametrageUploadFile(InputFile) {
    InputFile.filer({
        limit: 3, /// On limite à 3 uploads --> Ici cela correspond à 3 tentatives puisque le 2eme upload ecrase le fichier du 1er, et ainsi de suite.
        fileMaxSizefileMaxSize: parseInt($('#UF_maxSixe').text()),
        extensions: $('#UF_extensions').text().split(","),
        /*onSelect: function () {
            /// Construction d'une partie du nom du fichier sur l'évènement 'onSelect' avant d'uploader le fichier
            var PartDescrProd = $('#Promo_' + Promo.Num_Promo + ' .ChpSaisie_Prd').val().replace(/[^a-zA-Z0-9]/g, "").substr(0, 10);
            var LeFourn = $('#Promo_' + Promo.Num_Promo + ' .ChpSaisie_Fnr').val().replace(/[^a-zA-Z0-9]/g, "").substr(0, 7);
            var tempoDateSart = $('#Promo_' + Promo.Num_Promo + ' .ChpSaisie_DD').val().replace("/", "");
            var DateStart = tempoDateSart.substr(0, 4) + tempoDateSart.substr(7, 2);
            var tempoDateEnd = $('#Promo_' + Promo.Num_Promo + ' .ChpSaisie_DF').val().replace("/","");
            var DateEnd = tempoDateEnd.substr(0, 4) + tempoDateEnd.substr(7, 2);

            PartNomFichierUploade = LeFourn + "_" + DateStart + "_" + DateEnd + "_" + PartDescrProd;
            console.log(PartNomFichierUploade); //TEST
        },*/
        uploadFile: {
            url: '/Actualites/' + idcat + '/upload',
            data: null, //Data to be sent to the server {Object}
            //data: { partieNvNomFichier: PartNomFichierUploade }, //Data to be sent to the server {Object}
            type: 'POST',
            enctype: 'multipart/form-data',
            synchron: false, //Upload synchron the files
            beforeSend: function () { masque.removeClass('Hidden'); },
            success: function (response) {
                masque.addClass('Hidden');
                //console.log(response.nomFichierUpload); //TEST
            
                /// Intégration ds la variable 'DataFichierJson' du nom du fichier uploadé pour l'info en cours
                DataFichierJson.FichierUploadeEnCours = response.nomFichierUpload;
                
                filerKit = InputFile.prop("jFiler");
                //alert("Nb de fichiers : " + filerKit.files_list.length); //TEST
                /// IMPORTANT : Variable servant à savoir si au moins 1 fichier a été uploadé => Va servir pour vérification si upload lors de la validation de l'enregistrement du lien.
                /// pour ne pas autoriser plus d'un fichier uploadé à la fois
                if (filerKit.files_list.length > 0) {
                    filerKit.disable();
                }

            },
            error: function(el, l, p, o, s, jqXHR, textStatus, errorThrown) {
                /*Pour ne pas afficher la progress bar mais mettre à la place une icone signalant l'echec de l'upload*//*
                var parent = el.find(".jFiler-jProgressBar").parent();
                el.find(".jFiler-jProgressBar").fadeOut("slow", function(){
                    $("<div class=\"jFiler-item-others text-error\"><i class=\"icon-jfi-minus-circle\"></i> Error</div>").hide().appendTo(parent).fadeIn("slow");    
                });
                */
                
                console.log(el); console.log(l); console.log(p); console.log(o); console.log(s); // TEST
                console.log(jqXHR); console.log(textStatus); console.log(errorThrown); // TEST

                InputFile.trigger("filer.reset"); // Réinitialisation de l'encart d'affichage du fichier uploadé
                
                // Affichage message d'erreur
                /*Popin.removeClass('Hidden').addClass('Error').html("<b>" + textStatus.responseJSON.titre + "</b><div>" + textStatus.responseJSON.erreur.message + "</div><button class='ClosePopin'>OK</button>");
                */
               
                DisplayError(textStatus.responseText);

            },
            statusCode: null, //An object of numeric HTTP codes {Object}
            onProgress: null,//A function called while uploading file with progress percentage {Function}
            onComplete: null //A function called when all files were uploaded {Function}  
        },
        dragDrop: {
            dragEnter: null, //A function that is fired when a dragged element enters the input. {Function}
            dragLeave: null, //A function that is fired when a dragged element leaves the input. {Function}
            drop: null, //A function that is fired when a dragged element is dropped on a valid drop target. {Function}
            dragContainer: null //Drag container {String}
        },
        captions: {
            button: "Sélectionnez un fichier",
            feedback: "Choose files To Upload",
            feedback2: "files were chosen",
            drop: "Drop file here to Upload",
            removeConfirmation: "Voulez-vous vraiment supprimer ce fichier ?",
            errors: {
                filesLimit: "Only {{fi-limit}} files are allowed to be uploaded.",
                filesType: "Vous ne pouvez télécharger que des fichiers de type \"" + $('#UF_extensions').text().split(",") + "\".",
                filesSize: "'{{fi-name}}' est trop lourd! Téléchargez des fichier inférieur à {{fi-fileMaxSize}} MB.",
                filesSizeAll: "Files you've choosed are too large! Please upload files up to {{fi-maxSize}} MB.",
                folderUpload: "Vous n'êtes pas autorisé à télécharger des dossiers."
            }
        },
        /// Par défaut, les messages s'affichent dans des alert. Avec cette option, on peut les afficher avec nos propres dialogs
        dialogs: {
            alert: function (text) {
                masque.removeClass('Hidden');
                Popin.removeClass('Hidden').html(text + "<button class='ClosePopin'>OK</button>");
            },
            confirm: function (text, callback) {
                confirm(text) ? callback() : null;
            }
        },
        changeInput: '<div class="jFiler-input-dragDrop">\
                        <div class="jFiler-input-inner">\
                            <div class="wrapjFilerIcon">\
                                <div class="jFiler-input-icon"><i class="icon-jfi-cloud-up-o"></i></div>\
                            </div>\
                            <div class="jFiler-input-text">Glisser/déposer votre fichier ou cliquez ici</div>\
                        </div>\
                    </div>\
                    <div id="tooltipDisabled">Vous ne pouvez télécharger qu\'un seul fichier.<br />Supprimer le fichier ci-dessous pour pouvoir renouveler cette opération.</div>',
        showThumbs: true, //Show the in-browser files previews.
        onRemove: function () {
            localFileToDelete();
        }
    });
}

function localFileToDelete() {
    /// Requete de suppression de fichier
    $.ajax({
        url: '/Actualites/' + idcat + '/localFileToDelete',
        type: "POST",
        data: JSON.stringify({ fileToDelete : DataFichierJson.FichierUploadeEnCours }),
        async: false,
        contentType: "application/json; charset=utf-8",
        beforeSend: function () { masque.removeClass('Hidden'); },  /// Affichage d'un masque
        success: function (data) {
            delete DataFichierJson.FichierUploadeEnCours;
            filerKit.enable(); /// Après suppression du fichier précédamment uploadé, on rend à nouveau disponible l'upload file
            masque.addClass('Hidden'); /// Retrait du masque
        },
        error: function (e) {
            console.error(e);
            DisplayError(e.responseText);
        }
    });
}



function ToucheF5() {
    /// Afin d'éviter un reload qui répéterait la dernière opération réalisée avec le risque donc de supprimer à nouveau ou de dupliquer un lien.
    document.body.onkeydown = function (e) {
        //var keycode = checkKey(e);
        var keycode = (window.event ? window.event.keyCode : e.keyCode);
        if (keycode == 116) {
            alert("Vous tentez de rafraichir la fenêtre en appuyant sur F5 !\nCeci aurait eu pour effet de répéter la dernière opération\nque vous avez réalisé : vous risquez donc de supprimer à nouveau\nou de dupliquer un lien.\nVous avez néanmoins la possibilité de rafraîchir cette page\nen cliquant sur l'icone prévue à cet effet en haut de votre navigateur.\nSi c'est le cas et que vous voyez un pop-up d'avertissement,\nsachez que vous pouvez empecher une modification\nen cliquant sur 'Annuler'.");
            event.keyCode = 0;
            event.returnValue = false;
            return false;
        }
    }
}


// Pour rendre les liens dans la/les rubrique(s) 'sortable'
function SetLinksSortable() {
    $(".NewsAccueil").sortable({ 
        containment: 'parent', 
        cursor: 'move', 
        delay: 200, 
        handle: $('.Grip'), 
        placeholder: 'ui-state-highlight', 
        revert: 200, 
        stop: function () { GetSerialize("#" + this.id) } 
    });
}


// Appel fonction pour mise en ligne sur serveur de prod. des fichiers .json, pdf et suppression des pdf des liens suppprimés
function MiseEnLigne() {
    $.ajax({
        type: "GET",
        url: "/Actualites/"+ idcat + "/mep",
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        beforeSend: function () { masque.removeClass('Hidden'); }
    }).done(function(data) {
        // EN COURS
        if(data.missingFilesOnProd.length > 0) {} // <= PREPARER UN MSG

        var text = "<div>Votre mise à jour est effectuée !</div>A bientôt.";
        masque.removeClass('Hidden');
        //Popin.removeClass('Hidden').html(text + "<button class='ClosePopin'>OK</button>");
        Popin.removeClass('Hidden').html(text + "<a href='/'>OK</a>");
    })
    .fail(function(err) { 
        console.error(err); 
        DisplayError(err.responseText);
    });
}