'use strict';

const _ = require('lodash');
const Logger = require('../../lib/logger');
const ProfileAPI = require('../../lib/profileAPI');
const accountController = require('../account/account.controller');
const Shortlist = require('../../models/shortlists');
const config = require('../../config/index');

function searchProfile(req, res) {
    let source = req.query.source; //source is ajax, for pagination
    let pageSize = 5;
    let pageNumber = req.query.page || 0;
    let redirectTo = req.originalUrl;
    let userId;
    if (req.user) {
        userId = req.user._id;
    }
    let searchAlgo = () => {
        //case of basic query search
        if (req.query.q) {
            let q = req.query.q.trim();

            //case when linkedin url is searched
            if (q.indexOf('linkedin.com') !== -1) {
                //prepare set of urls separated with OR
                q = q.split("/");
                let linkedinDirectoryId = q.pop();
                if (linkedinDirectoryId === "") {
                    linkedinDirectoryId = q.pop();
                }
                q = "*" + linkedinDirectoryId;
            }
            //case when keywords are searched
            else {
                q = q.split(/[\s,;/]+/);
                q.map(function (item) {
                    return item.trim();
                });
                q = q.join(' ');

            }

            let queryObject = constructBasicSearchQueryObject(req.user, q, pageNumber, pageSize);
            ProfileAPI.request(queryObject)
                .then(function (result) {
                    generateProfileView(result.hits.hits, userId)
                        .then(function (profileView) {
                            let resultSet = {
                                userInfo: req.userInfo,
                                basicSearchQuery: {
                                    q: req.query.q
                                },
                                cdnEnable: config.cdnEnable,
                                profiles: profileView,
                                stats: stats(result, "basic"),
                                redirectTo: redirectTo
                            };

                            if (source) {
                                return res.status(200).json(resultSet);
                            }
                            else {
                                if (resultSet.profiles.length > 0) {
                                    resultSet.profiles.splice(2, 0, {advertisement: true});
                                }
                                res.render('search', resultSet);
                            }
                        })
                        .catch((err) => {
                            let resultSet = {
                                userInfo: req.userInfo,
                                basicSearchQuery: {
                                    q: req.query.q
                                },
                                cdnEnable: config.cdnEnable,
                                profiles: [],
                                redirectTo: redirectTo,
                                error: err.message
                            };
                            if (source) {
                                return res.status(200).json(resultSet);
                            }
                            else {
                                res.render('search', resultSet);
                            }
                        })
                })
                .catch(function (err) {
                    let resultSet = {
                        userInfo: req.userInfo,
                        basicSearchQuery: {
                            q: req.query.q
                        },
                        cdnEnable: config.cdnEnable,
                        profiles: [],
                        redirectTo: redirectTo,
                        error: err.message
                    };
                    if (source) {
                        return res.status(200).json(resultSet);
                    }
                    else {
                        res.render('search', resultSet);
                    }
                })
        }
        //advance search
        else if (req.query.name || req.query.keyword || req.query.job_title || req.query.location || req.query.company) {
            let queryObject;
            if (req.query.searchtype === 'similar')
                queryObject = constructAdvanceSearchSimilarQueryObject(req.user, req.query, pageNumber, pageSize);
            else
                queryObject = constructAdvanceSearchExactQueryObject(req.user, req.query, pageNumber, pageSize);

            ProfileAPI.request(queryObject)
                .then(function (result) {
                    if (result.hits.total === 0 && req.query.searchtype === 'similar') {
                        let resultSet = {
                            userInfo: req.userInfo,
                            advanceSearchQuery: {
                                name: req.query.name,
                                keyword: req.query.keyword,
                                job_title: req.query.job_title,
                                location: req.query.location,
                                company: req.query.company
                            },
                            profiles: [],
                            cdnEnable: config.cdnEnable,
                            redirectTo: redirectTo
                        };

                        if (source) {
                            return res.status(200).json(resultSet);
                        }
                        else {
                            res.render('search', resultSet);
                        }
                    }
                    // if no result found for 'exact' query
                    else if (result.hits.total === 0) {
                        Logger.info("Exact search got 0 hits, running similar search");
                        req.query.searchtype = 'similar';
                        searchProfile(req, res);
                    }
                    //if result is found, for any query exact or similar, show them.
                    else {

                        generateProfileView(result.hits.hits, userId)
                            .then(function (profileView) {

                                let resultSet = {
                                    userInfo: req.userInfo,
                                    advanceSearchQuery: {
                                        name: req.query.name,
                                        keyword: req.query.keyword,
                                        job_title: req.query.job_title,
                                        location: req.query.location,
                                        company: req.query.company,
                                    },
                                    profiles: profileView,
                                    stats: stats(result, req.query.searchtype || 'exact'),
                                    cdnEnable: config.cdnEnable,
                                    redirectTo: redirectTo
                                };

                                if (source) {
                                    return res.status(200).json(resultSet);
                                }
                                else {
                                    if (resultSet.profiles.length > 0) {
                                        resultSet.profiles.splice(2, 0, {advertisement: true});
                                    }
                                    res.render('search', resultSet);
                                }
                            })
                    }
                })
                //when error occured, just render page
                .catch(function (err) {
                    let resultSet = {
                        userInfo: req.userInfo,
                        advanceSearchQuery: {
                            name: req.query.name,
                            keyword: req.query.keyword,
                            job_title: req.query.job_title,
                            location: req.query.location,
                            company: req.query.company,
                        },
                        profiles: [],
                        cdnEnable: config.cdnEnable,
                        redirectTo: redirectTo,
                        error: err.message
                    };

                    if (source) {
                        return res.status(200).json(resultSet);
                    }
                    else {
                        res.render('search', resultSet);
                    }

                })
        }
        else {
            let resultSet = {
                userInfo: req.userInfo,
                cdnEnable: config.cdnEnable,
                redirectTo: redirectTo
            };
            if (source) {
                return res.status(200).json(resultSet);
            }
            else {
                res.render('search', resultSet);
            }
        }
    };

    //execution start here
    //For seemore option, check if account is 'free', if yes, then do not show any result
    if (source && parseInt(pageNumber) !== 1) {
        accountController.getUserAccountMiddleware(req, res, (accountResult) => {
            //user not logged in
            if (!accountResult.expiryAt) {
                return res.status(401).json({message: 'Login to unlock more results'});
            }
            // //user has 'free' plan
            // else if (!accountResult.subscriptionId || accountResult.subscriptionId === 'holaconnect-free') {
            //     return res.status(401).json({message: 'Upgrade plan to unlock more results'});
            // }
            else if (parseInt(pageNumber) > 25) {
                return res.status(401).json({message: 'Search result exhausted'});
            }
            else {
                searchAlgo();
            }
        });
    }
    else {
        searchAlgo();
    }
}

//elastic
let constructBasicSearchQueryObject = (user, q, pageNumber, pageSize) => {
    q = replaceStuffs(q);
    let queryObject = {
        index: config.elasticIndex,
        type: config.elasticType,
        db: "es",
        from: pageNumber * pageSize,
        size: pageSize,

        "source": ["fullName", "currentLocation", "headline", "imageUrl", "link", "linkedInUrl", "email"],
        "query": {
            "bool": {
                "must": [
                    {
                        "query_string": {
                            "fields": ["fullName", "currentLocation", "headline", "uid", "skills", "experience.organization.name"],
                            "query": q,
                            "default_operator": "AND"
                        }
                    }
                ],
                "should": [
                    {
                        "constant_score": {
                            "filter": {
                                "term": {
                                    "superActive": true
                                }

                            },
                            "boost": 30
                        }
                    },
                    {
                        "term": {
                            "isEmailAvailable": {
                                "value": true,
                                "boost": 2
                            }
                        }
                    }
                ],
                "filter": [
                    {
                        "regexp": {
                            "numConnections": "<20-500>.*"
                        }
                    }
                ]
            }
        }
    };
    if (user) {
        queryObject.social = true;
    }
    return {postBody: queryObject, endpoint: config.profileAPI + '/query'};
};

let constructAdvanceSearchSimilarQueryObject = (user, object, pageNumber, pageSize) => {
    let fullName = object.name;
    let skills = object.keyword;
    let job_title = object.job_title;
    let currentLocation = object.location;
    let company = object.company;


    //let queryMustBlock = [];
    let queryShouldBlock = [];
    if (fullName && fullName !== '') {
        fullName = replaceStuffs(fullName);
        let object = {
            "match": {
                "fullName": {
                    "query": fullName,
                    "operator": "and",
                    "boost": 2.0
                }
            }
        };
        queryShouldBlock.push(object);
    }
    if (job_title && job_title !== '') {
        job_title = replaceStuffs(job_title);
        let object = {
            "match": {
                "headline": {
                    "type": "phrase_prefix",
                    "query": job_title,
                    "operator": "and",
                }
            }
        };
        queryShouldBlock.push(object);
    }
    if (company && company !== '') {
        company = replaceStuffs(company);
        let object = {
            "nested": {
                "path": "experience",
                "query": {
                    "match_phrase": {
                        "experience.organization.name": company
                    }
                }
            }
        };
        queryShouldBlock.push(object);
    }
    if (currentLocation && currentLocation !== '') {
        currentLocation = replaceStuffs(currentLocation);
        let object = {
            "match": {
                "currentLocation": {
                    "query": currentLocation
                }
            },
        };
        queryShouldBlock.push(object);
    }


    /*
    if (skills && skills !== '') {
        skills = replaceStuffs(skills);
        let object = {
            "match": {
                "skills": {
                    "query": skills
                }
            }
        };
        queryShouldBlock.push(object);
    }
    */

    let emailAvailable = {
        "term": {
            "isEmailAvailable": {
                "value": true,
                "boost": 2
            }
        }
    };
    queryShouldBlock.push(emailAvailable);

    let superActive = {
        "constant_score": {
            "filter": {
                "term": {
                    "superActive": true
                }

            },
            "boost": 30
        }
    };
    queryShouldBlock.push(superActive);

    let queryObject = {
        index: config.elasticIndex,
        type: config.elasticType,
        db: "es",
        from: pageNumber * pageSize,
        size: pageSize,
        "_source": [
            "fullName",
            "currentLocation",
            "headline",
            "email"
        ],
        "query": {
            "bool": {
                "must": [
                    {
                        "regexp": {
                            "numConnections": "<20-500>.*"
                        }
                    }
                ],
                "should": queryShouldBlock,
            }
        }
    };
    if (user) {
        queryObject.social = true;
    }
    return {postBody: queryObject, endpoint: config.profileAPI + '/query'};
};

let constructAdvanceSearchExactQueryObject = (user, object, pageNumber, pageSize) => {
    let fullName = object.name;
    let job_title = object.job_title;
    let currentLocation = object.location;
    let company = object.company;


    let queryMustBlock = [];
    let queryShouldBlock = [];
    if (fullName && fullName !== '') {
        fullName = replaceStuffs(fullName);
        let object = {
            "match": {
                "fullName": {
                    "query": fullName,
                    "operator": "and",
                    "boost": 2.0
                }
            }
        };
        queryMustBlock.push(object);
    }
    if (job_title && job_title !== '') {
        job_title = replaceStuffs(job_title);
        let object = {
            "match": {
                "headline": {
                    //"type": "phrase_prefix",
                    "query": job_title,
                    "operator": "and",
                    "boost": 1.5
                }
            }
        };
        queryMustBlock.push(object);
    }
    if (company && company !== '') {
        company = replaceStuffs(company);
        let object = {
                "nested": {
                    "path": "experience",
                    "query": {
                        "match_phrase": {
                            "experience.organization.name": company
                        }
                    }
                }
            };
        queryMustBlock.push(object);
    }
    if (currentLocation && currentLocation !== '') {
        currentLocation = replaceStuffs(currentLocation);
        let object = {
            "match": {
                "currentLocation": {
                    "query": currentLocation,
                    "boost": 1.5
                }
            },
        };
        queryMustBlock.push(object);
    }
    /*
    if (skills && skills !== '') {
        skills = replaceStuffs(skills);
        let object = {
            "match": {
                "skills": {
                    "query": skills
                }
            }
        };
        queryMustBlock.push(object);
    }
    */


    let moreThan500 = {
        "regexp": {
            "numConnections": "<20-500>.*"
        }
    };
    queryMustBlock.push(moreThan500);


    let emailAvailable = {
        "term": {
            "isEmailAvailable": {
                "value": true,
                "boost": 2
            }
        }
    };
    queryShouldBlock.push(emailAvailable);

    let superActive = {
        "constant_score": {
            "filter": {
                "term": {
                    "superActive": true
                }

            },
            "boost": 30
        }
    };
    queryShouldBlock.push(superActive);


    let queryObject = {
        index: config.elasticIndex,
        type: config.elasticType,
        db: "es",
        from: pageNumber * pageSize,
        size: pageSize,
        "_source": [
            "fullName",
            "currentLocation",
            "headline",
            "email"
        ],
        "query": {
            "bool": {
                "must": queryMustBlock,
                "should": queryShouldBlock
            }
        }
    };
    if (user) {
        queryObject.social = true;
    }
    return {postBody: queryObject, endpoint: config.profileAPI + '/query'};
};

function validateEmail(email) {
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function validatePhone(phone) {
    let re = /(\+?(\(?\d+\)?)(\d+|-| ?)+(\d+|(\(\d+\)))( ?-?\d+)\b)/;
    return re.test(phone);
}

function maskString(string, till) {
    if (string) {
        let tillIdx = till ? string.indexOf(till) : string.length;
        return string[0] + Array(tillIdx).join('*') + string.slice(tillIdx - 1);
    } else return "";
}


function generateProfileView(hits, userId) {
    return new Promise((resolve, reject) => {
        hits = _.uniqBy(hits, hits.link);
        let actions = hits.map(prepareProfile);
        let results = Promise.all(actions);
        results.then(resolve).catch(reject);
    });
    function prepareProfile(object) {
        return new Promise((resolve, reject) => {
            //get images and select at random
            let imageUrl;
            if (object._source.photos && object._source.photos.length > 0) {
                imageUrl = object._source.photos[0].url;
            }
            else {
                imageUrl = object._source.imageUrl || "/img/profile.png";
            }
            let profile = {
                id: object._id,
                link: object._source.link,
                fullName: object._source.fullName.replace(/"/g, "") || '',
                location: object._source.currentLocation ? object._source.currentLocation.replace(/"/g, "") : '',
                headline: object._source.headline ? object._source.headline.replace(/"/g, "") : '',
                imageUrl: imageUrl
            };
            if (userId) {
                isShortlisted(object._id, userId)
                    .then(function (shortlisted) {
                        profile.shortlisted = shortlisted;
                        resolve(profile);
                    })
                    .catch(function (err) {
                        reject(err)
                    });
            } else {
                resolve(profile);
            }
        });
    }
}

function isShortlisted(profileid, userId) {
    return new Promise(function (resolve, reject) {

        Shortlist.findOne({userId: userId, profileId: profileid}).exec()
            .then(function (shortlistItem) {
                if (shortlistItem && shortlistItem.visibility > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            })
            .catch(function (err) {
                reject(err);
            });

    });
}


function stats(result, resultType) {
    const total = result.hits.total;
    const time = result.took / 1000;

    //result type ->  'similar' when result is not exact result
    //       type -> 'basic' when basic search
    if (total > 0 && resultType === 'similar') {
        return 'No result found for your keywords, showing similar results' + '(' + time + ' seconds)';
    }

    //result type -> undefined  when exact result found
    else if (total > 0 && resultType === 'exact') {
        if (total === 1) {
            return total + ' result (' + time + ' seconds)';
        } else {
            return intToWords(total) + ' of results (' + time + ' seconds)';
        }
    }
    else if (total > 0 && resultType === 'basic') {
        if (total === 1) {
            return total + ' result (' + time + ' seconds)';
        } else {
            return intToWords(total) + ' results (' + time + ' seconds)';
        }
    }
    else if (total === 0 && resultType === 'basic') {
        return 'No Results found, try Advanced Search!';
    }
    else {
        return 'No result found!'
    }
}

function intToWords(number) {
    if (number <= 99) {
        return number;
    }
    else if (number > 99 && number < 999) {
        return "Hundreds of";
    } else if (number > 999) {
        return "Thousands of";
    }
}

const utils = require('../../lib/utils');
let replaceStuffs = (string) => {
    string = string.replace(/bangalore/ig, "bengaluru");
    return utils.toLower(string);
};


module.exports = {
    searchProfile: searchProfile,
};