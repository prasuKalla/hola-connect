'use strict';

const Places = require('../../models/places');
const Logger = require('../../lib/logger');

function getPlaceSummary(location) {
    return new Promise((resolve, reject) => {

        if (!location) {
            return resolve(null);
        }
        else {
            Places.findOne({location: location})
                .then((loc) => {
                    if (loc) {
                        resolve(loc);
                    }
                    else {
                        resolve(null);
                    }
                })
                .catch((err) => {
                    Logger.error(err);
                    resolve(null);
                })
        }
    });

}

module.exports = {
    getPlaceSummary:getPlaceSummary
};


