(function () {


    $(document).ready(function () {
        $('#getInfo-btn').click(getInfo);
        $('#getProfileInfo-btn').click(getInfo);
        similarProfiles();
        setUserInfo();
    });


    function setUserInfo() {
        $.ajax({
            url: '/auth/profile',
            method: 'GET',

            success: function (data) {
                $('#userName').html('Welcome ' + data.userName);
                $('#creditLeft').html(data.creditLeft);
                $('#userLoggedIn').removeClass('d-none');
                $('#userLoggedOut').addClass('d-none');

                if (data.extensionEnabled) {
                    $('.holaExtension').css('display', 'none');
                }
            },

            error: function (err) {
                console.error(err);
                $('#userLoggedIn').addClass('d-none');
                $('#userLoggedOut').removeClass('d-none');

            }
        });
    }
    
    function similarProfiles() {
        let profileId = $('#profileId').attr('val');
        let fullName = $('#profile-name').html();
        let work = $('#profile-work').html();
        let currentLocation = $('#currentLocation').html();
        $.ajax({
            url: '/api/profile/similarProfiles',
            method: 'POST',
            data: {
                profileId:profileId,
                fullName:fullName,
                work:work,
                currentLocation:currentLocation
            },
            success: function (data) {
                let template = $('#similarProfilesScript').html();
                let similarNameTemplate = _.template(template)({
                    data: data
                });

                $('.similarProfiles').html(similarNameTemplate);

            },

            error: function (err) {

            }
        });

    }

    function getInfo() {

        window.location.href = "https://dashboard.lusha.co/signup";
    }
}());

function socialLinksModal() {
    $('#socialLinksModal').modal();
}
