$(function () {
    var BackOfficesWrap = $('#propositionBackOffices > div');
    masque = $(".masque");

    $("#SelectBO option:eq(0)").prop('selected', 'true'); // Pour mettre select en position par défaut qd reload

    $("#SelectBO").change(function () {
        var idcat = $(this).val();
        if(idcat !== "") { // Si sélection d'un cat...

            $.ajax({
                type: "GET",
                url: "/accueil/" + idcat,
                dataType: "json",
                beforeSend: function () { masque.removeClass('Hidden'); }
            }).done(function(data) {
                BackOfficesWrap.empty();
                var listeBO = data.liste_BO;
                for(var i=0; i < listeBO.backoffices.length; i++) {
                    BackOfficesWrap.append("<a href='/" + listeBO.backoffices[i].page + "/" + listeBO.idCat + "' " + (listeBO.backoffices.length == 1 ? "class='solo'" : "") + " >" + listeBO.backoffices[i].titre + "</a>");
                }
                BackOfficesWrap.addClass('Display').find('span').removeClass('Removed');
                masque.addClass('Hidden');
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

