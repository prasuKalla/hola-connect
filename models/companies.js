/**
 * Created by rakesh on 15/6/17.
 */
"use strict";

const express =  require('express');
const mongoose = require('mongoose');

const utils = require('../lib/utils');

let Schema = mongoose.Schema;

let subscriptionSchema = new Schema({
    _id: { type: String, required: true },      //currency is dollars

});

let Company = mongoose.model('Companies', subscriptionSchema);
module.exports = Company;


