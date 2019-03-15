"use strict";

const express =  require('express');
const mongoose = require('mongoose');

const utils = require('../lib/utils');

let Schema = mongoose.Schema;

let shortlistSchema = new Schema({
  profileId: { type: String, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'Users' , index: true },
  data: { 
    hidden: { type: Boolean, default: true , index: true }
  },
  tags: [{ type: String }],
  note: { type: String },
  viewCount : {type: Number, default: 1},
  connectionDegree: {type:Number, default: -1},
  profileLink: String,
  visibility: {type: Number, default:0},    // 0-> hidden; 1-> shortlist but no access to email;  2 -> shortlist and access to email(for dashboard view)
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now, index: true },
  deleted_at: { type: Date, default: '' }
});

let Shortlists = mongoose.model('Shortlists', shortlistSchema);
module.exports = Shortlists;