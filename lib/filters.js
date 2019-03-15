"use strict";

const express = require('express');


module.exports = {
    shortlistResult: (object) => {
        object = object.toObject(); // swap for a plain javascript object instance
        delete object["__v"];
        delete object["data"];
        delete object["viewCount"];
        delete object["connectionDegree"];
        delete object["leadId"];
        delete object["userId"];
        delete object["created_at"];
        delete object["updated_at"];
        delete object["deleted_at"];
        return object;
    },

    leadResult: (object) => {
        object = object.toObject();
        delete object["_id"];
        delete object["__v"];
        delete object["memberId"];
        delete object["experience"];
        delete object["education"];
        delete object["numConnections"];
        delete object["summary"];
        delete object["headline"];
        delete object["currentLocation"];
        delete object["geolocation"];
        delete object["data"];
        delete object["viewCountHola"];
        delete object["viewCountEvenrank"];
        delete object["skills"];
        delete object["created_at"];
        delete object["updated_at"];
        delete object["deleted_at"];
        return object;
    },

    accountResult: (object) => {
        object = object.toObject();
        delete object["__v"];
        delete object["_id"];
        delete object["data"];
        delete object["deleted_at"];
        delete object["subscriptionId"];
        delete object["userId"];
        delete object["deleted_at"];
        return object;
    },

    shortlistQueryInclusion: (object) => {
        object.userId= 0;
        object.data=0;
        object.viewCount= 0;
        object.connectionDegree=0;
        object.connectionDegree =0;
        object.deleted_at=0;
        object.__v=0;
        return object;
    },

    leadPopulateInclusion: (object) => {
        object._id =1;
        object.fullName = 1;
        object.job_title = 1;
        object.headline = 1;
        object.skills = 1;
        object.currentLocation = 1;
        object.linkedInPhotoUrl = 1;
        object.linkedInUrl = 1;
        object.twitterUrl = 1;
        object.facebookUrl = 1;
        object.gplusUrl = 1;
        object.crunchbaseUrl = 1;
        object.angelListUrl = 1;
        object.githubUrl = 1;
        object.updated_at = 1;
        return object;
    },
    leadQueryInclusion: (object) => {
        object._id = 0;
        object.emails =1;
        object.phoneNumbers =1;
        return object;
    }
};
