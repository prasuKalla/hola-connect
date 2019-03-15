"use strict";

const express = require('express');
const mongoose = require('mongoose');

const utils = require('../lib/utils');

let Schema = mongoose.Schema;

let accountSchema = new Schema({
    credit: {type: Number, required: true},
    userId: {type: Schema.Types.ObjectId, ref: 'Users', index: true},
    stripeCustomerId: {type: String},
    expiryAt: {type: Date, required: true},
    subscriptionId: {type: String, ref: 'Subscriptions'},
    stripeSubscriptionId:{type:String},
    subscriptionStatus: {type: Boolean, default: true},
    data: {
        hidden: {type: Boolean, default: false, index: true}
    },
    created_at: {type: Date, default: Date.now},
    updated_at: {type: Date, default: Date.now},
    deleted_at: {type: Date, default: ''}
});

let Accounts = mongoose.model('Accounts', accountSchema);
module.exports = Accounts;