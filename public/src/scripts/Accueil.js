
//var nomCatselected = null;
var Masque = null;

$(function () {
    //var redirection = null;

    var BackOfficesWrap = $('#propositionBackOffices > div');
    Masque = $(".masque");

    $("#SelectBO option:eq(0)").prop('selected', 'true'); // Pour mettre select en position par défaut qd reload

    $("#SelectBO").change(function () {
        /* OLD VERSION */
        /*clearTimeout(redirection);
        nomCatselected = $(this).val();

        if (nomCatselected === "Biomedi") {
            $('#propositionBackOffices > div').removeClass('Display');
            $("#FormBOPromos").submit();
        } else {
            if (typeof $('#SelectBO option:selected').data('manybo') !== "undefined") {
                $('#LinkActualites, #LinkPromotions').removeClass('Removed');
                $('#propositionBackOffices > div').addClass('Display');
            } else {
                $('#propositionBackOffices > div').removeClass('Display');
                redirection = setTimeout(function () { GoToGoogBO(nomCatselected) }, 500); /// Décalage avant ouverture du back office pour laisser voir animation et faire comprendre à l'utilisateur qu'il n'y a qu'un back offcie possible pour ce cat.
            }
        }
        
        $('#LinkActualites').on('click', function () {
            window.open("/Actualites/" + nomCatselected);
        });
        $('#LinkPromotions').on('click', function () {
            window.open("/Promos/" + nomCatselected);
        });
        */

        /* V2 */
        var idcat = $(this).val();
        if(idcat !== "") { // Si sélection d'un cat...

            $.ajax({
                type: "GET",
                url: "/accueil/" + idcat,
                dataType: "json",
                beforeSend: function () { Masque.removeClass('Hidden'); }
            }).done(function(data) {
                BackOfficesWrap.empty();
                var listeBO = data.liste_BO;
                for(var i=0; i < listeBO.backoffices.length; i++) {
                    BackOfficesWrap.append("<a href='/" + listeBO.backoffices[i].page + "/" + listeBO.idCat + "' " + (listeBO.backoffices.length == 1 ? "class='solo'" : "") + " >" + listeBO.backoffices[i].titre + "</a>");
                }
                BackOfficesWrap.addClass('Display').find('span').removeClass('Removed');
                Masque.addClass('Hidden');
            })
            .fail(function(err) {
                console.error(err);
                DisplayError(err.responseText);
            });
            
        } else { //...sinon si "Choisissez un catalogue"
            BackOfficesWrap.removeClass('Display');
        }

    });

    
    /*BackOfficesWrap.on('click', 'span', function() {
        console.log($(this).attr('data-href')); //TEST
    });*/

});

