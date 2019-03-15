"use strict";

const mongoose = require('mongoose');

let Schema = mongoose.Schema;

let optoutSchema = new Schema({
    holalink: {type: String, required: true, index:true},
    created_at: {type: Date, default: new Date()},
    email: {type:String, unique:true, required: true},
    name: {type:String},
    emailVerified: {type:Boolean, default: false},
    deleted: {type:Boolean, default: false},
});

let Optout = mongoose.model('optout', optoutSchema);
module.exports = Optout;