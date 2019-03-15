"use strict";
const Places = require('../../models/places');
const config = require('../../config/index');
const Logger = require('../../lib/logger');
const _ = require('lodash');

const googleMapsClient = require('@google/maps').createClient({
    key: config.googleAPIKey
});

//input is unformatted location we get from linkedin
function addLocations(locations) {
    locations = _.compact(locations);
    return new Promise((resolve, reject) => {
        Places.find({location: {$in: locations}}, {_id:0,clean_address:1,location:1, 'geometry.location':1 }).exec()
            .then((foundLocations) => {
                addToDatabase(locations, foundLocations);
                resolve(foundLocations);
            })
            .catch((err) => {
                Logger.error(err);
                resolve();
            })

    });
}


function addToDatabase(givenLocations, foundLocations) {
    //find diff givenLocations - foundLocations
    foundLocations = foundLocations.map(function (x) {
        return x.location;
    });
    let diff = _.difference(givenLocations, foundLocations);
    diff = _.uniq(diff);
    //foreach in diff
    for(let i = 0; i<diff.length;i++) {
        //call gmaps and get result
        getGeoCode(diff[i])
            .then(response => {

                let update = response.json.results[0];
                let cleanArray = cleanAddress(response.json.results[0].address_components);
                update.location = diff[i];
                update.clean_address = cleanArray.join(", ");
                let newCountry = new Country(update);

                newCountry.save((err, doc) => {
                    if(err)
                        Logger.error(err);
                })
            })
            .catch(err => {
                Logger.error(err);
            })
    }
}


function getGeoCode(location){
    return new Promise(function(resolve,reject){

        // Geocode an address.
        googleMapsClient.geocode({
            address: location
        }, function(err, response) {
            if (!err) {
                resolve(response);
            } else {
                reject(err);
            }
        });
    })
}

function cleanAddress(address_components) {
    let clean_address = [];
    for(let i = 0;i<address_components.length; i++) {
        let types = address_components[i].types;
        if (types.indexOf('locality') !== -1) {
            clean_address.push(address_components[i].long_name);
        }

        if (types.indexOf('administrative_area_level_1') !== -1) {
            clean_address.push(address_components[i].long_name);
        }

        if (types.indexOf('country') !== -1) {
            clean_address.push(address_components[i].long_name);
        }

        if (types.indexOf('postal_code') !== -1) {
            clean_address.push(address_components[i].long_name);
        }
    }
    return clean_address;
}

module.exports = {
    addLocations: addLocations
};
