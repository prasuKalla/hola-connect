let pageSize = 5;

$(function () {
    registerHandlers();

    function removeShortlist(e) {
        let btn = $(this);
        let id = btn.attr('id');
        let link = btn.attr('data-link');
        let profileName = btn.closest('.name').text().trim();

        // add to shortlist
        $.ajax({
            url: ' /api/shortlist/' + id,
            type: 'delete',
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Content-Type", "application/json");
            },
            error: function (e) {
                if (e.status === 401)
                    window.location.href = '/login/?redirectTo=/profile/' + link;
                else {
                    alert(e.responseJSON.message);
                }
            },
            success: function (response) {
                let parent = btn.parent();
                btn.remove();
                let plus = $('<button id="' + id + '" data-link="' + link + '" data-toggle="tooltip" data-placement="top" title="Add to my Contact list" class="btn btn-primary btn-plus"><i class="fa fa-user-plus" aria-hidden="true"></i></button>');
                parent.append(plus);
                plus.click(addShortlist);

                $('.shortlist').addClass('d-none');
                $('#profilepagetags').attr('shortlistId', '');
                $('#profilepagenote').attr('shortlistId', '');
                swal('', `${profileName} removed from leads`, 'warning')

            }
        });

    }

    function addShortlist(e) {

        let btn = $(this);
        let id = btn.attr('id');
        let link = btn.attr('data-link');
        let profileName = btn.closest('.name').text().trim();

        // add to shortlist
        $.ajax({
            url: '/api/shortlist/maskedshortlist',
            type: 'post',
            dataType: 'json',
            data: JSON.stringify({
                profileId: id,
                profileLink: link
            }),
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Content-Type", "application/json");
            },
            error: function (e) {
                if (e.status === 401)
                    window.location.href = '/login/?redirectTo=/profile/' + link;
                else {
                    alert(e.responseJSON.message);
                }
            },
            success: function (response) {
                if (response.message && response.message.heading !== '') {

                    $("#messageModal").modal();
                    $('#messageModalHeader').html(response.message.heading);
                    $('#messageModalBody').html(response.message.body);
                    $('#messageModalRedirectTo').attr('href', response.message.redirectTo);
                    $('#messageModalRedirectTo').html(response.message.redirectText);
                }
                else {
                    let parent = btn.parent();
                    btn.remove();
                    let minus = $('<button id="' + id + '" data-link="' + link + '" data-toggle="tooltip" data-placement="top" title="Remove from my Contact list" class="btn btn-primary btn-minus"><i class="fa fa-user-times" aria-hidden="true"></i></button>');
                    parent.append(minus);
                    minus.click(removeShortlist);
                    swal('', `${profileName} added to leads`, 'info')
                    //registerHandlers();
                }
            }
        });

    }

    function registerHandlers() {
        $('.btn-plus').click(addShortlist);
        $('.btn-minus').click(removeShortlist)
    }
});

$('#seemore').on('click', function () {
    let btn = $(this);
    let loader = $('.cssload-container');
    btn.hide();
    loader.show();
    let pageNumber = $('#seemore').attr('page');
    let params = window.location.href.split('?');
    params = params[1];


    //case of 1st click on seemore
    if (params.indexOf('page') === -1) {
        params = params + '&source=ajax' + '&page=' + pageNumber;
    }
    //other case
    else {
        let oldpage = pageNumber - 1;
        params.replace('page=' + oldpage, 'page=' + pageNumber);

    }
    $.ajax({
        url: '/search?' + params,
        method: 'GET',

        // dataType: 'JSON',
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Content-Type', "application/json");
        },
        complete: function () {
            btn.show();
            loader.hide();
        },
        success: function (data) {
            if (data.profiles.length < pageSize) {
                $('#seemore').addClass('hidden');
                bindData(data);
                $('#seemore').attr('page', parseInt(pageNumber) + 1);
            }
            else {
                $('#seemore').removeClass('hidden');
                bindData(data);
                $('#seemore').attr('page', parseInt(pageNumber) + 1);
            }

        },
        error: function (err) {
            swal('', err.responseJSON.message, 'error')
        }
    })
});
function bindData(data) {
    let template = $('#pageBind').html();
    let compileHTML = _.template(template)({
        data: data
    });
    $('.hc-profiles').append(compileHTML);
}

function analytics() {
    $.ajax({
        url: '/api/analytics/',
        type: 'post',
        dataType: 'json',
        data: JSON.stringify({
            event: 'pageview',
            page: 'search',
            fullPath: window.location.href

        }),
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Content-Type", "application/json");
        },
        error: function (e) {
            console.log(e);
        },
        success: function (response) {
            console.log(response);
        }
    });
}
$(document).ready(function () {
    //analytics();
});