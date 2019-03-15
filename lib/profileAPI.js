'use strict';

const config = require('../config/index');
const Logger = require('../lib/logger');

//done
let constructProfileFindQueryByMemberID = (memberID) => {

    //member ID is string
    return {
        postBody: {
            "index": config.elasticIndex,
            "type": config.elasticType,
            "social": true,

            "query": {
                "bool": {
                    "filter": {
                        "term": {
                            "memberId": {
                                "value": memberID
                            }
                        }
                    }
                }
            }
        },
        endpoint: config.profileAPI + "/query"
    }
};

//done
let constructProfileFindQueryByProfileId = (profileId,source) => {

    //member ID is string
    return {
        postBody: {
            "index":config.elasticIndex,
            "type": config.elasticType,
            "social": true,
            "source" : source && source.length > 0 ? source : ["email","contacts"],

            "query": {
                "bool": {
                    "filter": {
                        "term": {
                            "_key": {
                                "value": profileId
                            }
                        }
                    }
                }
            }
        },
        endpoint: config.profileAPI + "/query"
    };
};


let constructProfileFindQueryBylink = (link) => {

    //member ID is string
    return {
        postBody: {
            "index": config.elasticIndex,
            "type": config.elasticType,
            "social": true,
            "query": {
                "bool": {
                    "filter": {
                        "term": {
                            "link": {
                                "value": link
                            }
                        }
                    }
                }
            }

        },
        endpoint: config.profileAPI + "/query"
    }
};

let constructProfileFindByLinkedInUrl = (linkedInUrls) => {

    linkedInUrls.forEach((q, i) => {
            //prepare set of urls separated with OR
            q = q.split("/");
            let linkedinDirectoryId = q.pop();
            if (linkedinDirectoryId === "") {
                linkedinDirectoryId = q.pop();
            }
            linkedInUrls[i] = linkedinDirectoryId;
    });

    return {

        postBody: {
            "index": config.elasticIndex,
            "type": config.elasticType,
            "db": "es",
            "source": ["fullName", "currentLocation", "headline", "imageUrl", "link", "email"],

            "query": {
                "bool": {
                    "filter": {
                        "terms": {
                            "uid": linkedInUrls
                        }
                    }
                }
            }

        },
        endpoint: config.profileAPI + "/query"
    }
};

let constructCompanyDetailQuery = (company) => {

    return {
        postBody: {
            "index": "company",
            "type": "company",
            "source": ["name", "website", "size", "founded", "hq", "overview"],

            "query": {
                "term": {
                    "name.raw": {
                        "value": company
                    }
                }
            }

        },
        endpoint: config.profileAPI + "/query"
    }
};

let request = (query) => {

    let body = query.postBody;
    let endpoint= query.endpoint;

    let request = require('request');
    return new Promise(function (resolve, reject) {
        {
            request({
                url: endpoint,
                method: 'POST',
                dataType: 'json',
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body) //Set the body as a string
            }, function (error, response, body) {
                if (error) {
                    Logger.error('ProfileAPI error: '+ error.message);
                    reject({statusCode: 500, message:'Internal Server Error, Please try again later'});
                } else {
                    if (response.statusCode === 200) {
                        resolve(JSON.parse(body));
                    }

                    else if (response.statusCode === 429) {
                        Logger.error('ProfileAPI error: ' + response);
                        reject({statusCode: response.statusCode, message:'Too many requests from this IP, please try again later'});
                    }
                    else {
                        Logger.error('ProfileAPI error: ' + response);
                        reject({statusCode: response.statusCode, message:'ProfileAPI error, please try again later'});
                    }
                }
            });
        }
    });
};

function generateLink(profile) {
    return profile.firstName + '-' + profile.lastName + '-email-phone-' + profile._key.slice(-8);
}

function deleteProfile(query) {

    let body = {"index":query.index,"type":"profile","id":query.id};
    let endpoint= query.endpoint;
    let request = require('request');
    return new Promise(function (resolve, reject) {
        {
            request({
                url: endpoint,
                method: 'DELETE',
                dataType: 'json',
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body) //Set the body as a string
            }, function (error, response, body) {
                if (error) {
                    Logger.error(error);
                    reject(error);
                } else {
                    if (response.statusCode === 200) {
                        resolve(JSON.parse(body));
                    }
                    else {
                        reject('profileAPI error');
                    }
                }
            });
        }
    });
}

let constructProfileFindByName = (fullName, source) => {
    return {
        postBody: {
            "index": config.elasticIndex,
            "type": config.elasticType,
            social: true,
            size: 10,
            source: source || ['fullName', 'email', 'currentLocation', 'link', 'experience','headline'],

            "query": {
                "bool": {
                    "must": [
                        {
                            "match_phrase": {
                                "fullName": fullName.trim()
                            }
                        }
                    ],
                    "should": [
                        {
                            "term": {
                                "isEmailAvailable": {
                                    "value": "true"
                                }
                            }
                        }]
                }
            }
        },
        endpoint: config.profileAPI + "/query"
    }
};


let constructReconcileQueryByKey = (profileId) => {
    return {
        postBody: {
            "index": config.reconcileIndex,
            "type": 'reconcile',
            "query": {
                "term": {
                    "_key": {
                        "value": profileId
                    }
                }
            }
        },
        endpoint: config.profileAPI + "/query"
    }
};

let constructProfileFindByWork = (company, currentLocation, source) => {
    return {
        postBody: {
            "index": config.elasticIndex,
            "type": config.elasticType,
            social: true,
            size: 10,
            source: source || ['fullName',  'email', 'currentLocation', 'link', 'experience', 'headline'],

            "query": {
                "bool": {
                    "must": [
                        {
                            "nested": {
                                "path": "experience",
                                "query": {
                                    "match_phrase": {
                                        "experience.organization.name": company
                                    }
                                }
                            }
                        },
                        {
                            "match_phrase": {
                                "currentLocation": currentLocation
                            }
                        }
                    ],
                    "should": [
                        {
                            "term": {
                                "isEmailAvailable": {
                                    "value": "true"
                                }
                            }
                        }]
                }
            }
        },
        endpoint: config.profileAPI + "/query"
    }
};


module.exports = {
    constructProfileFindQueryByMemberID: constructProfileFindQueryByMemberID,
    constructProfileFindQueryByProfileId: constructProfileFindQueryByProfileId,
    constructProfileFindQueryBylink: constructProfileFindQueryBylink,
    constructCompanyDetailQuery:constructCompanyDetailQuery,
    constructReconcileQueryByKey:constructReconcileQueryByKey,
    constructProfileFindByLinkedInUrl: constructProfileFindByLinkedInUrl,
    constructProfileFindByName: constructProfileFindByName,
    constructProfileFindByWork: constructProfileFindByWork,
    deleteProfile:deleteProfile,
    request: request
};