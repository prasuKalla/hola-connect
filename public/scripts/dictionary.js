
$(document).ready(function () {
    let pageNo = findGetParameter('page') || 0;
    let company = findGetParameter('text');

    if (pageNo && company) {
        $("#prev").removeClass('hidden');
    }

});

function back() {
    window.location.href = "../directory/company";
}
function findGetParameter(parameterName) {
    let result = null,
        tmp = [];
    let items = location.search.substr(1).split("&");
    for (let index = 0; index < items.length; index++) {
        tmp = items[index].split("=");
        if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
    }
    return result;
}
function prev() {

    let text = findGetParameter('text');
    let pageNo = findGetParameter('page') || 0;

    let count = parseInt(pageNo) - 1;

    if (count < 1) {
        count = 0;
    }
    if (pageNo == 0) {
        window.location.href = "../directory/company";
    } else {
        window.location.href = "../directory/company?text=" + text + '&page=' + count;
    }

}

function  nextDesignation() {

    let text = findGetParameter('text');
    let pageNo = findGetParameter('page') || 0;
    let count = parseInt(pageNo) + 1;
    if (count < 0) {
        count = 0;
    }

    window.location.href = "../directory/designation?&page=" + count;
}
function next() {
    let text = findGetParameter('text');
    let pageNo = findGetParameter('page') || 0;
    let count = parseInt(pageNo) + 1;
    if (count < 0) {
        count = 0;
    }

    window.location.href = "../directory/company?text=" + text + '&page=' + count;
}

function dict(el) {
    let clickedword = $(el).html().replace(/\s/g, "");
    if (clickedword.length == 1) {
        $('#btn-back').removeClass('hidden')
        $('.f-word').each(function (index) {
            let existingWord = $(this).html().replace(/\s/g, "");
            $(this).html(clickedword + existingWord);
        });
    } else {
        window.location.href = "../directory/company?text=" + clickedword;

    }

}

function Showdesignation(el,source) {
    $(el).parent().parent().find('.h-active').removeClass('h-active');
    $(el).addClass('h-active')
}