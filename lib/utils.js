"use strict";

const _ = require('lodash');
const decodeUriComponent = require('decode-uri-component');


module.exports = {
	toLower : (v) => {
    return v.toLowerCase();
  },

  toTitleCase:  (str) => {
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  },

  updateObjectFields: (mainObject, newObject) => {
    // get fields from newObject, and update in mainObject
    let arrayFieldsToUpdate = ['emails','phoneNumbers'];
    let property;
    for ( property in newObject)
    {
      if (property === 'tags' || property === 'note') {
        mainObject[property] = newObject[property];
      }
      if (property === 'linkedInPhotoUrl') {
        mainObject[property] = newObject[property];
      }
      if (_.indexOf(arrayFieldsToUpdate, property) !== -1)
      {
        mainObject[property] = _.union(mainObject[property], newObject[property]);
      }
      else if(_.isString(newObject[property]) && newObject[property] === '') {
        //doNothing
      }
      else if (_.isArray(newObject[property]) && newObject[property].length === 0){
        //doNothing
      }
      else
        {
        mainObject[property] = newObject[property];
      }
    }
    mainObject.updated_at = Date.now();
    return mainObject;
  },

  setObjectFields:  (mainObject, newObject) => {
    let property;
    for ( property in newObject) {
      let value = newObject[property];
      mainObject[property] = value;
    }
    return mainObject;
  },

  setQueryFilter: (filter) => {
    filter.deleted_at = 0;
    //filter.updated_at = 0;
    //filter.created_at = 0;
    filter.data = 0;
    return filter;
  },

  appendQueryMatch: (match) => {
    let hiddenKey = 'data.hidden';
    match[hiddenKey] = false;
    match['deleted_at'] = null;
    return match;
},

  prettyPrint: (object) => {
  return JSON.stringify(object);
},
    holaLinkToOriginal: (link) => {
        let returnLink;
        /*
      If the link doesnt contain -email-phone, check if its celeb link.
      For celeb link, use it as is, for non celeb link, add -email-phone before elastic query
   */
        if (link.indexOf('-celeb-') !== -1) {
            returnLink=link;
        }
        else {
            link = link.split('-');
            link.splice(link.length-1, 0, 'email-phone');
            returnLink = link.join('-');
        }
    return returnLink;
    },

    holaLinkToRedirect: (link) => {
        return link.replace('-email-phone','');
    },

    decodeHolaLink: (link) => {
        return unescape(decodeUriComponent(link));
    }
};
