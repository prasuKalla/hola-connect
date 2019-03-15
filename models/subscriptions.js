/*
# Project:        Description:                  Comments:
# Hola Connect    Business Intelligence for     API for Dashboard and extension
#                 Linkedin Data.
#
#
# Created_At:     Updated_At:     Version:      File_content:
# 17-Oct-2016     17-Oct-2016     1.0.0         Subscription Schema.
*/

"use strict";

const express =  require('express');
const mongoose = require('mongoose');

const utils = require('../lib/utils');

let Schema = mongoose.Schema;

let subscriptionSchema = new Schema({
  _id: {type: String, required: true},
  name: { type: String, required: true, unique: true , index: true },
  price: { type: Number, required: true },      //currency is dollars
  credit: { type: Number, required: true},
  expiryDays: { type: Number, required: true, default: 1 },
  pastCredit: { type: Boolean, required: true, default: false },
  canExport: { type: Boolean, default: false },
  slug:{type: String},
  data: {
    hidden: { type: Boolean, default: false }
  },
  description: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: '' }
});

let Subscriptions = mongoose.model('Subscriptions', subscriptionSchema);
module.exports = Subscriptions;