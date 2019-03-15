const Logger = require('../../lib/logger');
const Util = require('../../lib/utils');
const ProfileAPI = require('../../lib/profileAPI');
const config = require('../../config/index');
const Optout = require('../../models/optout');



function onOptout(req, res) {
    let holaLink = Util.holaLinkToOriginal(req.body.holalink);
    holaLink = Util.decodeHolaLink(holaLink);

    let newOptout = new Optout({
       holalink: holaLink,
       email: req.body.email,
       name: req.body.name,
        emailVerified: true,
        deleted:true
    });

    newOptout.save((err, doc) => {
        if(err) {
            if(err.message.indexOf("E11000") !== -1)
                 res.status(500).json({message:"This email has already been used for Optout"});
            else
                 res.status(500).json({message:"Internal Database Error"});

            return;
        }
        else {
            deleteFromElastic(holaLink);
            res.status(200).json({message:"Your optout is complete. Profile will get deleted in 3-5 days"})
        }



    });

}

function deleteFromElastic(holalink){
    let arr = holalink.split('/');
    let link = arr.pop();
    if (link.length <3 ) {
        link = arr.pop();
    }
    let constructQuery = ProfileAPI.constructProfileFindQueryBylink(link);
    ProfileAPI.request(constructQuery)
        .then(function (result) {
            if(!result.hits.hits[0]) {
                //update doc as verified
                console.debug('[Optout] Profile doesnt exist');
            }
            else {
                //prepare delete query
                let id = result.hits.hits[0]._id;
                let index = result.hits.hits[0]._index;

                let cQuery = {index:index, type:config.elasticType, id:id, endpoint: config.profileAPI+"/delete"};
                ProfileAPI.deleteProfile(cQuery)
                    .then(result => {
                        console.info('[Optout] Profile deleted')
                    })
                    .catch(error => {
                        Logger.error(error);
                        setTimeout(function () {
                            return deleteFromElastic(holalink);
                        },2000);
                    });
            }
        })
        .catch(error => {
            Logger.error(error);
            setTimeout(function () {
                return deleteFromElastic(holalink);
            },2000);
        })
}

module.exports = {
    onOptout: onOptout
};