'use strict';

const request = require('request');
const Places = require('../../models/places');
const Logger = require('../../lib/logger');
const Config = require('../../config/index');


//reads collection and generate wiki_description for places which are not yet updated
function getDescriptionInBatch() {
    if (Config.placesDescription) {
        Places.findOne({wiki_summary: {$exists: false}})
            .then((result) => {
                if (!result) {
                    return 'batch complete';
                }
                else {
                    let text = cleanPlace(result.clean_address);
                    wikiAPI(text)
                        .then((summary) => {

                            if (summary) {
                                //remove patterns
                                summary = summary.replace('( ( listen)','');
                                //remove anything inside brackets
                                summary = summary.replace(/ *\([^)]*\) */g, "");
                            }

                            Logger.info(summary);
                            result.wiki_summary = summary;
                            result.save((err) => {
                                if (err) {
                                    Logger.error(err);
                                }
                                getDescriptionInBatch();
                            })
                        })
                }
            })
            .catch((err) => {
                Logger.error(err);
                getDescriptionInBatch();
            })
    }
}


function cleanPlace(location) {

    let isZipCode = function (location) {
        let x = location[location.length -1];
        //let zipcode = x.match(/^[0-9]*$/g);
        let zipcode = parseInt(x);
        if (isNaN(zipcode)) {
            return false;
        }
        else {
            return true;
        }

    };

    location = location.replace(/\barea\b/ig, '');
    location = location.replace(/\bbengaluru\b/ig, 'Bangalore');
    location = location.split(',');
    //remove zip code if present
    if (isZipCode(location)) {
        location.pop();
    }

    let country = location.pop();
    let state = location.pop();
    let city = location.pop();

    let text;

    if (state) {
        text= state;
    }
    else {
        text= country;
    }
    return text.trim();
}


function wikiAPI(text) {
    return new Promise((resolve,reject) => {

        if (require('./places')[text]) {
            return resolve(require('./places')[text])
        }

        else {
            let wikiURI = 'https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=' + text;
            request(wikiURI, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    body = JSON.parse(body);
                    body = body.query.pages[Object.keys(body.query.pages)[0]].extract;

                    // if (!body || body.length < 100 || body.indexOf('This is a redirect from a title with a different spelling of the target name') !== -1 || body.indexOf(text + ' may refer to') !== -1 || body.indexOf(text + ' can refer to') !== -1 || body.indexOf(text + ' most commonly refers to') !== -1 || body.indexOf(text + ' may also refer to') !== -1 || body.indexOf('This is a redirect from a') !== -1 || body.indexOf(text + ' is the name of several places') !== -1 || body.indexOf(text + ' as a place name may refer to') !== -1 || body.indexOf(text + ' most often refers to') !== -1 )
                    if (!body || body.length < 100 || body.indexOf('This is a redirect from a title with a different spelling of the target name') !== -1 || body.indexOf('refer to') !== -1 || body.indexOf('refers to') !== -1 || body.indexOf(text + ' is the name of several places') !== -1)

                    {
                        return resolve(null);
                    }
                    else {
                        body.replace('"','');
                        return resolve(body);
                    }
                }
                else {
                    Logger.error('error:', error); // Print the error if one occurred
                    console.error('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                    return resolve(null);
                }
            });
        }
    });
}

module.exports = {
    getDescriptionInBatch:getDescriptionInBatch
};
