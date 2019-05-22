var SubmitMiseEnLigne = null;

$(function () {
    /// Pour fermeture masque et popin
    $('body').on("click", "#CloseEncart", function () {
        $('#Wrapper_Encart').remove();
        $('.masque').addClass('Hidden');

        if(SubmitMiseEnLigne !== null) {
            SubmitMiseEnLigne.prop('disabled', false);
         }
    });

    if($('#SubmitMiseEnLigne').length > 0) {
        SubmitMiseEnLigne = $('#SubmitMiseEnLigne');
     }
});

function DisplayError(ErreurResponseText) {
    var thehtml = $.parseHTML(ErreurResponseText);
    $('body').prepend(thehtml);
    $('#Wrapper_Encart')
        .addClass('retourAjax')
        .find('#Encart')
        .prepend("<i class='fa fa-times' id='CloseEncart' />");

    if(SubmitMiseEnLigne !== null) { SubmitMiseEnLigne.prop('disabled', true) }
}

/*
function DisplayError_V2(Popin, error) {
    Popin
        .removeClass('Hidden')
        .addClass('Error')
        .html("\
        <div class='Titre'>" + error.responseJSON.titre + "</div>\
        <div>" + (error.statusText !== "" ? error.statusText : "")  + "</div>\
        " + (error.responseJSON.erreur.customMsg ? "<div>" + error.responseJSON.erreur.customMsg + "</div>" : "")  + "\
        " + (error.responseJSON.erreur.path ? "<div>" + error.responseJSON.erreur.path + "</div>" : "") + "\
        " + (error.responseJSON.erreur.resume ? "<div>" + error.responseJSON.erreur.resume + "</div>" : "") + "\
        " + (error.responseJSON.erreur.stack ? "<div style='text-align: left;'>" + error.responseJSON.erreur.stack + "</div>" : "") + "\
        <button class='ClosePopin'>OK</button>\
        ");
}
*/
