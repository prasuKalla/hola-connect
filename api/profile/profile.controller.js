"use strict";

const Shortlist = require('../../models/shortlists');
const shortlistController = require('../shortlist/shortlist.controller');
const ProfileDBAPI = require('../../lib/profileAPI');

const Logger = require('../../lib/logger');
const Util = require('../../lib/utils');
const config = require('../../config/index');
const _ = require('lodash');


_.mixin({
    compactObject: function(o) {
        let clone = _.clone(o);
        _.each(clone, function(v, k) {
            if(!v) {
                delete clone[k];
            }
        });
        return clone;
    }
});

let getPhoneNumber = (profile) => {

    let contacts = profile._source.contacts;

    if ( contacts && contacts.length > 0 ) {
        return contacts;
    }
    else {
        return profile._source.phoneNumbers || '';
    }

};

//hola search page
//-----------------

function maskString(email, till) {
    if(email && email.constructor === Array && email.length === 0){

        return reduceString();
    }

    else if(email && email.constructor === Array && email.length > 0){
        let returnVal = [];
        email.forEach(function(x){
            returnVal.push(reduceString(x));
        });
      return returnVal;
    }
    else {
        return reduceString(email);
    }

    function reduceString(string){
      if (string) {
        let tillIdx = till ? string.indexOf(till) : string.length;
        let result = string[0] + Array(tillIdx).join('*') + string.slice(tillIdx - 1);
        return result;
      }
      else {
        return Array(10).join('*');
      }
    }
}


function getTitle(profile) {
    let fullName = profile._source.fullName || '';
    let email = maskString(profile._source.email, '@');
    let headline = profile._source.headline ? profile._source.headline : '';
    //var location = profile._source.currentLocation ? profile._source.currentLocation : '';

    let base = `${fullName}'s email address & phone number - ${email} `;
    if (headline) {
        base += `| ${headline} `
    }
    base = base.replace(/"/g, "");
    return base;
}

function getDesc(profile) {
    let fullName = profile._source.fullName || '';
    let firstName = profile._source.firstName;
    let company = getCompany(profile);

    let totalExp = profile._source.profileStatistics ? profile._source.profileStatistics.totExpYears.toString() : '';

    let education = getEducation(profile);

    let location = profile._source.currentLocation ? profile._source.currentLocation : '';

    let base = '';
    if (company && company !== 'Not Available') {
        base += `${fullName} currently works at ${company} `;
    }
    if (totalExp) {
        if (totalExp > 1) {
            base += ` with total ${totalExp} years of experience.`;
        }
        else if (totalExp === 1) {
            base += `with 1 year of experience.`;
        }
    }
    if (education && education !== 'Not Available') {
        base += `${firstName} studied at ${education} and `;
    }
    if (location) {
        base += `${firstName} is located at ${location}.`;
    }
    base = base.replace(/"/g, "");
    return base;

}

function getKeywords(profile) {
    let fullName = profile._source.fullName || '';
    let company = getCompany(profile);
    let location = profile._source.currentLocation ? profile._source.currentLocation : '';

    let base = `${fullName} `;
    if (company) {
        base += `, ${company} `;
    }
    if (location) {
        base += `, ${location} `;
    }
    base += `, ${fullName};s Email Address, ${fullName};s Phone Number, email search, email lookup, email address lookup`;
    base = base.replace(/"/g, "");
    return base;
}


function showProfile(req, res) {
    let link = req.params.link;

   // added to make profile link different when page is served

   /*
        This is redirection. If link contains -email-phone, remove email-phone from link and redirect to new profile link.
        New profile link will add it before making elastic query
   */
   if (link.indexOf('-email-phone') !== -1) {
       return res.redirect('/profile/' + Util.holaLinkToRedirect(link));
   }

   /*
       If the link doesnt contain -email-phone, check if its celeb link.
       For celeb link, use it as is, for non celeb link, add -email-phone before elastic query
    */
   link = Util.holaLinkToOriginal(link);

    let source = req.query.source;
    let redirectTo = '/profile/' + link;
    if (link && link !== '') {
        let queryByLink = ProfileDBAPI.constructProfileFindQueryBylink(link);
        ProfileDBAPI.request(queryByLink)
            .then(function (responseBody) {
                let profile = responseBody.hits.hits;
                if (profile && profile.length > 0) {
                    renderResponse(req, res, profile[0], link, redirectTo, source);
                }
                //no profile found
                else {
                    res.render('404', {
                        userInfo: req.userInfo,
                        redirectTo: redirectTo
                    });
                }
            })
            //internal error or too many requests
            .catch(function (err) {
                res.render('error', {
                    userInfo: req.userInfo,
                    redirectTo: redirectTo,
                    message: err.message,
                    statusCode: err.statusCode
                });
            });
    }
    //link is not present or empty string
    else {
        res.render('404', {
            userInfo: req.userInfo,
            redirectTo: redirectTo
        });
    }
}

function showReconciled(req, res) {
    let profileId = req.params.profileId;
    let userId = req.user._id;
    if (!profileId) {
        return res.status(404).json({message:'Invalid parameters'});
    }
    else {
        shortlistController.isShortlisted(userId, profileId)
            .then((shortlist) => {
                if (!shortlist) {
                    return res.status(200).json({});
                }
                else {
                    let query = ProfileDBAPI.constructReconcileQueryByKey(profileId);
                    ProfileDBAPI.request(query)
                        .then((response) => {
                            let reconcile = {email:[], contact:[]};


                            if (response.hits.hits.length === 0) {
                                return res.status(200).json({reconcile: reconcile});
                            }
                            else {
                                response = response.hits.hits[0];
                                let email = response._source.reconciledEmail;
                                let contact = response._source.reconciledContact;

                                email = _.sortBy(email, [function (o) {
                                    return -o.matchCount;
                                }]);
                                contact = _.sortBy(contact, [function (o) {
                                    return -o.matchCount;
                                }]);

                                email = email.slice(0, 3);
                                email = email.map((o) => {return o.email});

                                contact = contact.slice(0, 3);
                                contact = contact.map((o) => {return o.number});

                                return res.status(200).json({reconcile: {email:email, contact:contact}})
                            }
                        })
                        .catch((err) => {
                            Logger.error(err);
                            return res.status(500).json({message:'Something went wrong, please try again'});
                        })
                }
            });
    }
}

function similarProfiles(req, res) {
    let profileId = req.body.profileId;
    let fullName = req.body.fullName;
    let work = req.body.work ? req.body.work.split(' at ').pop() : 'Google';
    let currentLocation = req.body.currentLocation ? req.body.currentLocation : "San Francisco Bay Area";

    let fullNameQuery = ProfileDBAPI.constructProfileFindByName(fullName);
    let workQuery = ProfileDBAPI.constructProfileFindByWork(work, currentLocation);

    Promise.all([ProfileDBAPI.request(fullNameQuery), ProfileDBAPI.request(workQuery)])
        .then(([fullNameProfiles, workProfiles]) => {

            let similarProfiles = [];
            for (let i = 0; i < 10; i++) {
                if (similarProfiles.length > 10 ) {
                    break;
                }
                else {
                    let x = fullNameProfiles.hits.hits[i];
                    let y = workProfiles.hits.hits[i];
                    if (x && x._id !== profileId) {
                        similarProfiles.push({
                            fullName: x._source.fullName,
                            imageUrl: getPhoto(x),
                            link: x._source.link,
                            currentLocation: x._source.currentLocation || '',
                            work: x._source.headline
                        })
                    }

                    if (y && y._id !== profileId) {
                        similarProfiles.push({
                            fullName: y._source.fullName,
                            imageUrl: getPhoto(y),
                            link: y._source.link,
                            currentLocation: y._source.currentLocation || '',
                            work: y._source.headline
                        })
                    }
                }
            }
            return res.status(200).send(similarProfiles);
        })
        .catch((err) => {
            Logger.error(err);
            return res.status(200).send([]);
        })
}

let renderResponse = (req, res, profile, link, redirectTo, source) => {
    //normalize string
    let responseObject = {};

    /*
    //create hidden shortlist
    if (req.user) {
        shortlistController.createHiddenShortlist(req.user, profile, -1, (err, response) => {
        });
    }
    */
    //AccountController.getUserAccountMiddleware(req, res, function (accountItem) {
    responseObject.cdnEnable = config.cdnEnable;
    responseObject.fullName = profile._source.fullName.replace(/"/g, "") || '';
    responseObject.currentLocation = profile._source.currentLocation ? profile._source.currentLocation.replace(/"/g, "") : '';
    responseObject.headline = profile._source.headline ? profile._source.headline.replace(/"/g, "") : '';
    responseObject.socialLinks = getSocialProfiles(profile);
    responseObject.suggestions = getSuggestions(profile);
    responseObject.title = getTitle(profile);

    if (profile._source.skills) {
        responseObject.skills = profile._source.skills.map(function (object) {
            return {
                skill: object,
                link: '/search?q=' + object
            }
        });
    }
    responseObject.description = profile._index === config.elasticCelebIndex ? profile._source.summary : getDesc(profile);
    responseObject.keywords = getKeywords(profile);
    responseObject.photo = getPhoto(profile);
    responseObject.work = getWork(profile);
    responseObject.previousWork = getPastWork(profile);
    responseObject.education = getDegreeAndInstitute(profile);
    responseObject.link = link;
    responseObject.profileId = profile._id;
    //email
    responseObject.maskedMail = maskString(profile._source.email, '@');
    //phone
    responseObject.maskedNumber = maskString(profile._source.phoneNumber ? profile._source.phoneNumber : '9*********');

    responseObject.redirectTo = redirectTo;

    /*
    responseObject.userInfo = req.userInfo;
    if (accountItem.creditLeft) {
        responseObject.creditLeft = accountItem.creditLeft;
    }
    else
        responseObject.creditLeft = 'NA';


    if (accountItem.expiryAt) {
        let expiryAt = new Date(accountItem.expiryAt);
        expiryAt = expiryAt.getDate() + '/' + (expiryAt.getMonth() + 1) + '/' + expiryAt.getFullYear();
        responseObject.expiryAt = expiryAt;
    }
    else {
        responseObject.expiryAt = 'NA';
    }
    */

    let allPromises = [getIndustryDetail(profile._source.industry), getCompanyDetail(getCompany(profile)), require('../places/places.controller').getPlaceSummary(responseObject.currentLocation)];

    Promise.all(allPromises)
        .then(([industryDetail, companyDetail, locationDetail]) => {
            responseObject.industryDetail = industryDetail;
            responseObject.companyDetail = companyDetail;
            responseObject.locationDetail = locationDetail;
            //final response, render page or give json
            if (source) {

                return res.status(200).json(responseObject);
            }
            else {
                return res.render('profile', responseObject);
            }
        });
    //});
};

let getIndustryDetail = (industry) => {
    return new Promise((resolve, reject) => {
        try {
            let detail = require('../industry/industry')[industry];
            if (detail) {
                detail.companies = Array.isArray(detail.companies) ? detail.companies.join(', '): detail.companies;
                detail.total_doc = 291379859;
                resolve(detail);
            }
            else {
                resolve(null);
            }

        }
        catch(err) {
            Logger.error(err);
        }

    })
};

let getCompanyDetail = (company) => {
    return new Promise((resolve, reject) => {

        if (company === 'Not Available') {
            return resolve(null);
        }
        else {
            let queryCompanyDetail = ProfileDBAPI.constructCompanyDetailQuery(company);

            ProfileDBAPI.request(queryCompanyDetail)
                .then(function (companyDetail) {
                    if (companyDetail.hits.hits[0]) {
                        resolve(companyDetail.hits.hits[0]._source);
                    }
                    else {
                        resolve(null);
                    }

                })
        }
    })
};

let getWork = (profile) => {
    let company = '';
    if (profile._source.experience && profile._source.experience.length > 0) {
        if (profile._source.experience[0].title) {
            company = company + profile._source.experience[0].title + ' at ';
        }
        if (profile._source.experience[0].organization.name) {
            company = company + profile._source.experience[0].organization.name;
        }
        if (profile._source.experience[0].organization.location) {
            company = company + ', ' + profile._source.experience[0].organization.location;
        }
    }
    else {
        company = profile._source.headline || 'Not Available';
    }
    company = company.replace(/"/g,"");

    return company;
};

let getPastWork = (profile) => {
    let company = [];
    if (profile._source.experience && profile._source.experience.length > 1) {
            profile._source.experience.forEach((x) => {
                if (x.organization.name) {
                    company.push(x.organization.name)   ;
                }
            });
            company.shift();
            company = company.join(', ');
    }
    else {
        company = 'Not Available';
    }
    company = company.replace(/"/g, "");
    return company;
};

let getCompany = (profile) => {
    let company = '';
    if (profile._source.experience && profile._source.experience.length > 0) {
        company = company + profile._source.experience[0].organization.name;
        company = company.replace(/"/g,"");
    }
    else {
        company = 'Not Available';
    }
    return company;
};

let getEducation = (profile) => {
    let education = '';
    if (profile._source.education && profile._source.education.length > 0) {
        if (profile._source.education[0].name) {
            education = profile._source.education[0].name;
            education = education.replace(/"/g,"");
        }
    }
    if (education === '') {
        education = 'Not Available';
    }
    return education;
};

let getDegreeAndInstitute = (profile) => {
    let education = '';
    if (profile._source.education && profile._source.education.length > 0) {
        if (profile._source.education[0].degrees && profile._source.education[0].degrees.length > 0) {
            let degree = profile._source.education[0].degrees[0];
            education = education + degree + '@';
        }
        if (profile._source.education[0].name) {
            let institute = profile._source.education[0].name;
            education = education + institute;

        }
    }
    if (education === '') {
        return 'Not Available';
    }
    else {
        return education.replace(/"/g, "");
    }
};


let getSocialProfiles = (profile) => {
    let socialLink = profile._source.socialLinks || {};
    socialLink.linkedin = profile._source.linkedInUrl;

    /*
        Font icon key for wikipedia is by different name i.e. wikipedia-w
     */
    if (socialLink.wikipedia) {
        socialLink['wikipedia-w'] = socialLink.wikipedia;
        delete socialLink.wikipedia;
    }

    delete socialLink.klout;
    delete socialLink.gravatar;
    delete socialLink.myspace;
    return _.compactObject(socialLink);
};

let getPhoto = (profile) => {
    let imageUrl;
    if (profile._source.photos && profile._source.photos.length > 0) {
        imageUrl = profile._source.photos[0];
    }
    else
        imageUrl = profile._source.imageUrl || "/img/profile.png";

    return imageUrl;
};


let getSuggestions = (profile) => {
    let suggestion = {
        similarNameLink: '/search?q=' + profile._source.fullName.replace(/"/g, ""),
        similarNameText: profile._source.fullName.replace(/"/g, ""),
        similarLocationLink: '/search?q=' + profile._source.currentLocation.replace(/"/g, ""),
        similarLocationText: profile._source.currentLocation.replace(/"/g, ""),

        similarTitleText: 'CEO',
        similarTitleLink: '/search?q=ceo',

        similarCompanyText: 'Google',
        similarCompanyLink: '/search?q=Google'
    };

    //similarTitleText
    if (profile._source.experience && profile._source.experience.length > 0 && profile._source.experience[0].title) {
        let similarTitleText = profile._source.experience[0].title.replace(/"/g, "");
        suggestion.similarTitleText = similarTitleText;
        suggestion.similarTitleLink = '/search?q=' + similarTitleText;

    }

    //similarCompanyText
    if (profile._source.experience && profile._source.experience.length > 0 && profile._source.experience[0].organization && profile._source.experience[0].organization.name) {
        let similarCompanyText = profile._source.experience[0].organization.name.replace(/"/g, "");
        suggestion.similarCompanyText = similarCompanyText;
        suggestion.similarCompanyLink = '/search?q=' + similarCompanyText;
    }

    return suggestion;
};

//used in extension dashboard
let getProfileInfo = (req, res) => {
    let profileId = req.params.profileId;

    Shortlist.findOne({userId:req.user._id,profileId:profileId}).exec()
        .then(function (doc) {
            if(doc && doc.visibility === 2){
                let query = ProfileDBAPI.constructProfileFindQueryByProfileId(profileId);
                ProfileDBAPI.request(query)
                    .then(function (profileItem) {
                        if (profileItem.hits.total > 0) {
                            return res.status(200).json({
                                email: convertEmailToArray(profileItem.hits.hits[0]._source),
                                contact: getPhoneNumber(profileItem.hits.hits[0])
                            });
                        }

                        else
                            return res.status(200).json({email: [], contact: []});
                    })
                    .catch(function (err) {
                        return res.status(200).json({email: [], contact: []});
                    })

            } else {
                // profile not shortlisted by user.
                res.status(401).json({message:'Profile not shortlisted'})
            }
        })
        .catch(function (err) {
            res.status(500).json({message:'Internal Server Error'});
        })


};

function convertEmailToArray(profile) {
    let email = profile.email;
    let predictedEmails = profile.predictedEmails;

    let ret = [];

    if (email && email.constructor === String) {
        ret.push(email);
    }
    else if (email && email.constructor === Array) {
        ret = ret.concat(email);
    }

    if (predictedEmails && predictedEmails.length > 0) {
        ret = ret.concat(predictedEmails);
    }
    return ret;

}
//------------------
module.exports = {
    showProfile: showProfile,
    similarProfiles:similarProfiles,
    showReconciled:showReconciled,
    getSocialProfiles:getSocialProfiles,
    getProfileInfo: getProfileInfo
};
