/**
 * Created by rakesh on 19/6/17.
 */
// from json rakesh
'use strict'

const express =  require('express');
const mongoose = require('mongoose');

const utils = require('../lib/utils');

let Schema = mongoose.Schema;
var designationSchema = new Schema({
    _id: String,
});

var Designation = mongoose.model('designations', designationSchema);


module.exports=Designation;
