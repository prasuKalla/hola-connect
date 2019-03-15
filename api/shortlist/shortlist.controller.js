"use strict";

const Account = require('../../models/accounts');
const Shortlist = require('../../models/shortlists');
const ProfileDBAPI = require('../../lib/profileAPI');

const AccountController = require('../account/account.controller');

const Logger = require('../../lib/logger');
const Util = require('../../lib/utils');
const Config = require('../../config/index');
const _ = require('lodash');
const fs = require('fs');

//api for setting the invisible shortlist to visible(i.e access to viewing email)
let updateShortlist = (req, res) => {

    let userId = req.user._id;
    let query;

    //for web search
    if (req.body.holasearchlink) {
        let holasearchlink = Util.decodeHolaLink(req.body.holasearchlink.replace('#',''));
        /*
            If the link doesnt contain -email-phone, check if its celeb link.
            For celeb link, use it as is, for non celeb link, add -email-phone before elastic query
        */
        holasearchlink = Util.holaLinkToOriginal(holasearchlink);
        query = ProfileDBAPI.constructProfileFindQueryBylink(holasearchlink);
    }


    else {
        return res.status(400).send({message: 'Bad query parameter'})
    }

    ProfileDBAPI.request(query)
        .then(function (result) {
            if (!result.hits.total) {
                Logger.error("profile not available for " + JSON.stringify(query.postBody.term));
                return res.status(404).send({"message": "profile does not exist"})
            }
            else {
                Account.findOne({userId: userId}).exec((err, accountItem) => {
                    if (err) {
                        Logger.error(err);
                        return res.status(500).send({message: "Internal Server Error"});
                    }
                    if (!accountItem) {
                        Logger.error("no account for user %s", userId);
                        return res.status(404).send({message: "no account for user %s", userId});
                    }

                    let profile = result.hits.hits[0];
                    //we assume this doc is already in shortlist, because /checkLead call will always be called before /updateShortlist
                    Shortlist.findOne({userId: userId, profileId: profile._id})
                        .exec((err, shortlistItem) => {
                            if (err) {
                                Logger.error(err);
                                return res.status(500).send({message: "Internal Server Error"});
                            }
                            //should never come here ideally, but can come if user is viewing cached pages. In that case, create a hidden shortlist
                            else if (!shortlistItem) {
                                Logger.info("no shortlist for user" + userId + " and lead " + profile._id + ', creating one');
                                //return res.status(404).send({message: "no such shortlist exist"});
                                createHiddenShortlist(req.user,profile, -1, (err, shortlist) => {
                                    if (err) {
                                        Logger.error(err);
                                        return res.status(500).send({message: "Internal Server Error"});
                                    }
                                    else {
                                        return  updateShortlist(req, res);
                                    }
                                });
                            }

                            // already shortlisted before or email/phone dont exist
                            else if (shortlistItem.visibility === 2 || ! profile._source.email) {
                                Logger.info("user " + userId + "already shortlisted lead " + profile._id + ", view now for free");
                                let shortlist = {_id:shortlistItem._id,  tags: shortlistItem.tags, note: shortlistItem.note};
                                let socialLinks = getSocialProfiles(profile);
                                let returnprofile = {email: convertEmailToArray(profile._source), contact: getPhoneNumber(profile), socialLinks:socialLinks};
                                let account = {creditLeft: accountItem.credit, expiryAt: accountItem.expiryAt};
                                return res.status(200).send({shortlist: shortlist, profile: returnprofile, account: account});
                            }

                            // not shortlisted before, this is first call, credit will be deducted
                            else {
                                let updatedCredit = getCreditRequiredToShortlist(profile._source.creditWeight, shortlistItem.connectionDegree, accountItem.credit);


                                //case when credit is available and plan is not expired
                                if (accountItem.expiryAt.getTime() >= Date.now() && updatedCredit >= 0) {

                                    accountItem.credit = updatedCredit;
                                    accountItem.save(function (err)  {
                                        if (err) {
                                            Logger.error(err);
                                        }
                                        else {
                                            Logger.info("Credits decremented for user " + userId + " for shortlisting " + profile._id);
                                        }

                                    });

                                    let responseBody = {
                                        shortlist: null,
                                        profile: {
                                            email: convertEmailToArray(profile._source),
                                            contact: getPhoneNumber(profile),
                                            socialLinks: getSocialProfiles(profile)
                                        },
                                        account: {
                                            creditLeft: accountItem.credit,
                                            expiryAt: accountItem.expiryAt
                                        },
                                        message: null
                                    };
                                    //case when account subscription is 'free'
                                    if (accountItem.subscriptionId === 'holaconnect-free') {
                                        Shortlist.find({userId:userId, visibility: {$gte: 1}}).estimatedDocumentCount().exec()
                                            .then(function (countOfShortlist) {

                                                // when shortlist threshold is reached for free account, donot create shortlist, but return emails
                                                if (countOfShortlist >= 25) {

                                                    responseBody.message = {
                                                        heading: 'Upgrade your subscription plan',
                                                        body: 'You have exhausted your 25 contact limit. You can view the contact now but it wont be added to your dashboard contacts. Please upgrade subscription to add this profile to your contact list in Dashboard. ',
                                                        //redirectTo: '/pricing',
                                                        redirectTo: '/contact',
                                                        redirectText: 'Upgrade Now'
                                                    };
                                                    return res.status(200).send(responseBody);
                                                }

                                                // when shortlist threshold is not reached for free account, create shortlist and update account + return emails
                                                else {
                                                    createUnmaskedShortlist(userId,profile,shortlistItem);

                                                    responseBody.shortlist =  {_id:shortlistItem._id,tags: shortlistItem.tags, note: shortlistItem.note};

                                                    return res.status(200).send(responseBody);
                                                }

                                            })
                                            .catch(function (err) {
                                                Logger.error(err);
                                                return res.status(500).send({message: 'Internal server error'});
                                            });
                                    }

                                    //case when account subscription is 'paid', create shortlist and update account + return emails
                                    else {
                                        createUnmaskedShortlist(userId, profile, shortlistItem);
                                        responseBody.shortlist =  {_id:shortlistItem._id,tags: shortlistItem.tags, note: shortlistItem.note};
                                        MailerController.creditEnding(req.user, accountItem);
                                        return res.status(200).send(responseBody);
                                    }
                                }
                                else if (updatedCredit >= 0) {
                                    Logger.info("subscription expired for user %s", userId);
                                    let responseBody = {
                                        heading: 'Subscription expired',
                                        body: 'Please upgrade subscription to get info',
                                        // redirectTo: '/pricing',
                                        redirectTo: '/contact',
                                        redirectText: 'Upgrade Now'
                                    };
                                    return res.status(402).send(responseBody);
                                }
                                else {
                                    Logger.info("credit expired for user %s", userId);
                                    let responseBody = {
                                        heading: 'Insufficient credits',
                                        body: 'Please upgrade subscription to get info',
                                        //redirectTo: '/pricing',
                                        redirectTo: '/contact',
                                        redirectText: 'Upgrade Now'
                                    };
                                    return res.status(402).send(responseBody);
                                }
                            }
                        });
                });
            }
        })
        .catch(function (err) {
            Logger.error(err);
            return res.status(500).send({message: "Internal error"});
        })
};



let getPhoneNumber = (profile) => {

    let contact = profile._source.contacts;

    if (contact) {
        return contact;
        // let phones =[];
        // profile._source.contacts.forEach(function (object) {
        //     if(object.mobile)
        //         phones.push(object.mobile);
        // });
        // return phones.join(' , ')
    }
    else {
        return profile._source.phoneNumbers || '';
    }

};

let generateCSVurl = (req, res, next) => {
    let userId = req.user._id;
    Account.findOne(Util.appendQueryMatch({userId: userId}, {_id:0, subscriptionId:1}))
        .populate('subscriptionId', 'canExport')
        .exec((err, accountItem) => {
            if (err){
                return res.status(500).send({message: "db error"});
            }
            else if (accountItem.subscriptionId.canExport) {

                // Shortlist.find(Util.appendQueryMatch({userId: userId}))
                Shortlist.find({userId: userId, visibility: {$gte: 2}})
                    .sort({updated_at: -1})
                    .exec((err, shortlistItems) => {
                        if (err) {
                            return res.status(500).send({message: "db error"});
                        }
                        // call elastic to fetch results

                        var actions = shortlistItems.map(getShortlistInfo);
                        var results = Promise.all(actions);
                        results.then(profilesWithData => {
                            let finalResult = [];
                            profilesWithData.forEach(function(shortlistItem){
                               if(shortlistItem){
                                   let object = {};
                                   object.fullName = shortlistItem.fullName || '';
                                   if (shortlistItem.email === Array){
                                       if(shortlistItem.email.length > 0){
                                           object.email = shortlistItem.email.join();
                                       } else{
                                           object.email = '';
                                       }
                                   } else {
                                       object.email = shortlistItem.email;
                                   }
                                   if(shortlistItem.contact === Array){
                                       if (shortlistItem.contact.length >0){
                                           object.contact = shortlistItem.contact.join();
                                       }
                                       else{
                                           object.contact = '';
                                       }
                                   } else {
                                       object.contact = shortlistItem.contact;
                                   }
                                   object.headline = shortlistItem.headline || '';
                                   object.currentLocation = shortlistItem.currentLocation.name || '';
                                   object.holaUrl = shortlistItem.link || '';
                                   object.linkedInUrl = shortlistItem.linkedInUrl || '';
                                   if (shortlistItem.tags.length > 0){
                                       object.tags = shortlistItem.tags.join();
                                   }
                                   else{
                                       object.tags = '';
                                   }
                                   object.note = shortlistItem.note || '';
                                   object.note = object.note.replace(/^\s+|\s+$/g, '');
                                   finalResult.push(object);
                               }
                            });
                            jsonToCSV(userId, finalResult, (err, fileUrl) => {
                                if (err) {
                                    Logger.error("csv file create error for %s, %s", userId, Util.prettyPrint(err));
                                    return res.status(500).send({message: "Internal server error"});
                                }
                                return res.status(200).send({fileUrl: fileUrl});
                            });

                        });


                    });
            }
            //not allowed to export csv
            else {
                return res.status(403).send({message:'Upgrade plan for this feature.'});
            }
        });

    function getShortlistInfo(profile){ // sample async action
        return new Promise((resolve,reject) => {
            let query = ProfileDBAPI.constructProfileFindQueryByProfileId(profile.profileId, ["fullName","email","contact","headline","currentLocation","link","linkedInUrl"]);
            ProfileDBAPI.request(query)
                .then(function (response) {
                    if(response.hits.total > 0){
                        var profileItem = response.hits.hits[0]._source;
                        profileItem.id = profile.profileId;
                        profileItem.tags = profile.tags;
                        profileItem.note = profile.note;
                        resolve(profileItem);
                    } else {
                        // profile do not exist resolve null
                        resolve(null);
                    }
                })
                .catch(function (err) {
                    reject(err);
                })
        });
    }
};


let jsonToCSV = (userId, JSONObjectArray, cb) => {
    let fieldList = [];
    let property;
    for ( property in JSONObjectArray[0])
    {
        fieldList.push(property);
    }
    const json2csv = require('json2csv');
    let csvOutput = json2csv({ data: JSONObjectArray, fields:fieldList });
    let filename = (new Date).toISOString().slice(0,10).replace(/-/g,"") + '_hola_' + new Buffer(userId.toString()).toString('base64') + ".csv";
    let fileFullPath = process.cwd() + '/public/csv/' + filename;
    fs.writeFile(fileFullPath, csvOutput, function(err) {
        if (err) {
            return cb(err);
        }
        let fileUrl =  Config.host + "/csv/" + filename;
        return cb(null, fileUrl);
    });
};

let getCreditRequiredToShortlist = (creditWeight, connectionDegree, currentCredit) => {
    if (connectionDegree === 1) {
        return currentCredit;
    }
    else {
        return currentCredit -1;
    }
};


let allMyShortlists = (req, res) => {
    let userId = req.user._id;
    //let limit= req.body.limit || 10;
    let limit= req.body.limit;
    let skip = (req.body.pageNumber -1) * limit;
    Shortlist.find({userId: userId, visibility: {$gte: 1}}, {}, {skip: skip, limit: limit}).sort({updated_at: -1})
        .exec((err, profiles) => {
            if (err) {
                return res.status(500).send({message: 'Internal error'});
            } else {
                // map over forEach since it returns
                var actions = profiles.map(getProfileInfo); // run the function over all items.
                // we now have a promises array and we want to wait for it
                var results = Promise.all(actions);
                results.then(profilesWithData => {
                    return res.status(200).send(profilesWithData);
                })
                    .catch(function(err){
                        Logger.error(err);
                        return res.status(500).send({message:'Internal Server Error'});
                    });
            }
        })
};

function getProfileInfo(profile){ // sample async action
    return new Promise((resolve,reject) => {
        if(!profile.profileId) {
           return resolve(null);
        }
        let query = ProfileDBAPI.constructProfileFindQueryByProfileId(profile.profileId, ["fullName","headline","currentLocation","socialLinks","link","linkedInUrl","imageUrl","photos"]);
        ProfileDBAPI.request(query)
            .then(function (response) {
                if(response.hits.total > 0){
                    var profileItem = response.hits.hits[0]._source;
                    profileItem.id = profile.profileId;
                    profileItem.socialLinks = getSocialProfiles(response.hits.hits[0]);
                    profileItem.tags = profile.tags;
                    profileItem.note = profile.note;
                    profileItem.updatedAt = profile.updated_at;
                    resolve(profileItem);
                } else {
                    // profile do not exist resolve null
                    resolve(null);
                }
            })
            .catch(function (err) {
               reject(err);
            })
    });
}

//get one shortlist profile
let getMyShortlist = (req, res) => {
    let userId = req.user._id;
    let profileId = req.params.profileId;
    Shortlist.findOne({userId: userId, profileId: profileId})
        .exec((err, item) => {
            if (err) {
                return res.status(500).send({message: 'Internal server error'});
            }
            else if (!item || item.visibility === 0) {
                return res.status(404).send({message: 'no such shortlist exist'});
            }
            else if(item && item.visibility === 1){
                return res.status(200).send(item);
            }
            else {
                return res.status(200).send(item);
            }
        });
};

let isShortlisted = (userId, profileId) => {
    return new Promise((resolve, reject) => {
        Shortlist.findOne({userId: userId, profileId: profileId})
            .exec((err, item) => {
                if (err) {
                    return resolve(false);
                }
                else if (!item) {
                    return resolve(false);
                }
                else {
                    return resolve(item);
                }
            })
    })
};

//update one shortlist item, with tags and notes
let updateMyShortlist = (req, res) => {
    let shortlistId = req.params.shortlistId;
    let updateObject = req.body.shortlist;
    Shortlist.findOne({_id: shortlistId})
        .exec((err, result) => {
            if (err) {
                return res.status(400).send({message: 'not allowed'});
            }
            if (!result) {
                if (req.body.middle) {
                    let err = {};
                    err.status = 404;
                    err.message = "Item not found";
                    return next(err);
                }
                return res.status(404).send({"message": "item not found"});
            }
            result = Util.updateObjectFields(result, updateObject);
            result.save((err, item) => {
                if (err) {
                    res.status(500).send({message: 'Internal error'});
                }
                res.status(200).send({});
            });
        });
};

//delete one shortlist profile
let deleteMyShortlist = (req, res) => {
    let profileId = req.params.profileId;
    let userId = req.user._id;
    Shortlist.findOne({userId: userId, profileId: profileId})
        .exec((err, result) => {
            if(err) {
                return res.status(400).send(err);
            }
            if (!result) {
                return res.status(404).send({"message": "item not found"});
            }
            result.deleted_at = Date.now();
            //result.data.hidden = true;
            result.visibility = 0;
            result.save((err, item) => {
                return res.status(200).send({});
            });
        });
};


//create one hidden shortlist profile
let createHiddenShortlist = (user,profile, connectionDegree, cb) => {
    Shortlist.findOne({userId: user._id, profileId: profile._id}).exec()
        .then(function(shortlistItem) {
            if (!shortlistItem) {
                let newShortlist = new Shortlist();
                newShortlist.profileId = profile._id;
                newShortlist.userId = user._id;
                newShortlist.connectionDegree = isNaN(connectionDegree) ? -1: connectionDegree;
                //newShortlist.data.hidden = true;
                newShortlist.visibility = 0;
                newShortlist.save((err, shortlistItem) => {
                    if (err) {
                        Logger.error(err);
                        cb(err);
                    }
                    cb(null,shortlistItem);
                });
            }
            else {
                updateViewCountInShortlist(shortlistItem, function (err, updatedShortlistItem) {});
                cb(null, shortlistItem);
            }
        })
        .catch(function (err) {
            Logger.error(err);
            cb(err);
        })
};

//create one masked shortlist profile, user shortlisted this profile but do not have access to viewing email
// use in search page shortlisting
let createMaskedShortlist = (req, res) => {
    let userId = req.user._id;
    let profileId = req.body.profileId;
    let profileLink = req.body.profileLink;

    function createMaskedShortlistConstructor() {
        Shortlist.findOne({userId: userId, profileId: profileId}).exec()
            .then(function (shortlistItem) {
                if (!shortlistItem) {
                    let newShortlist = new Shortlist();
                    newShortlist.profileId = profileId;         //_id of elastic doc
                    newShortlist.profileLink = profileLink;
                    newShortlist.userId = userId;
                    newShortlist.visibility = 1;
                    newShortlist.save((err, shortlistItem) => {
                        if (err) {
                            Logger.error(err);
                            return res.status(500).send({message: 'Internal server error'});
                        }
                        return res.status(200).send(shortlistItem);
                    });
                } else if (shortlistItem.visibility === 0) {
                    shortlistItem.visibility = 1;
                    shortlistItem.save((err) => {
                        if (err) {
                            Logger.error(err);
                            return res.status(500).send({message: 'Internal server error'});
                        }
                        return res.status(200).send(shortlistItem);
                    });
                }
                else {
                    return res.status(200).send(shortlistItem);
                }
            })
            .catch(function (err) {
                Logger.error(err);
                return res.status(500).send({message: 'Internal server error'});
            })
    }

    //begin
    AccountController.getUserAccountMiddleware(req, res, function (accountItem) {

        //if account is free or undefined, check for shortlist count. If count > 10, donot allow shortlist creation
        if (!accountItem.subscriptionId || accountItem.subscriptionId === 'holaconnect-free') {

            Shortlist.find({userId: userId, visibility: {$gte: 1}}).estimatedDocumentCount().exec()
                .then(function (shortlistCount) {
                    if (shortlistCount >= 25) {
                        var message = {
                            heading: 'Upgrade your subscription plan',
                            body: 'Free user plan is limited to adding 25 contacts to their contact list',
                            redirectTo: '/pricing',
                            redirectText: 'Upgrade Now'
                        };
                        return res.status(200).send({message:message});
                    }
                    else {
                        createMaskedShortlistConstructor();
                    }
                })
                .catch(function (err) {
                    Logger.error(err);
                    return res.status(500).send({message: 'Internal server error'});
                });
        }
        //case when account subscription is paid
        else {
            createMaskedShortlistConstructor();
        }
    });
};


let createUnmaskedShortlist = (userId, profile, shortlistItem) => {
    shortlistItem.visibility = 2;
    shortlistItem.deleted_at = null;
    shortlistItem.updated_at = Date.now();
    shortlistItem.save((err) => {
        if (err) {
            Logger.error(err);
            return res.status(500).send({message: "Internal Server Error"});
        }
        // update credit used in account
        else {
            Logger.info("user " + userId + " successfully shortlisted lead " + profile._id);
            updateViewCountInShortlist(shortlistItem, function (err, updatedShortlistItem) {});
        }
    });
};

let updateViewCountInShortlist = (shortlistItem, cb) => {
    shortlistItem.viewCount = shortlistItem.viewCount +1;
    shortlistItem.updated_at = Date.now();
    shortlistItem.save((err) => {
        if (err){
            Logger.error(err);
            return cb(err);
        }
        return cb(null, shortlistItem);
    });
};

function convertEmailToArray(profile)
{
  var email = profile.email;
  var predictedEmails = profile.predictedEmails;

  var ret = [];

  if (email && email.constructor === String){
    ret.push(email);
  }
  else if(email && email.constructor === Array){
    ret = ret.concat(email);
  }

  if(predictedEmails && predictedEmails.length > 0){
    ret = ret.concat(predictedEmails);
  }
  return ret;
}

function getSocialProfiles (profile) {
    return require('../profile/profile.controller').getSocialProfiles(profile);
}

module.exports = {
    updateShortlist: updateShortlist,
    updateViewCountInShortlist: updateViewCountInShortlist,
    generateCSVurl: generateCSVurl,
    allMyShortlists: allMyShortlists,
    getMyShortlist: getMyShortlist,
    updateMyShortlist: updateMyShortlist,
    deleteMyShortlist:deleteMyShortlist,
    createHiddenShortlist: createHiddenShortlist,
    createMaskedShortlist: createMaskedShortlist,
    isShortlisted: isShortlisted
};