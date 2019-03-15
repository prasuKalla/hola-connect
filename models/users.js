"use strict";

const mongoose = require('mongoose');

const Utils = require('../lib/utils');

const Schema = mongoose.Schema;

let userSchema = new Schema({
    name: {type: String, set: Utils.toTitleCase},
    email: {type: [String], lowercase: true, index: true},
    password: String,
    google: {id: String, token: String},
    linkedin: {id: String, memberId: {type: Number, index: true}, token: String},
    phone: {type: [String]},
    photoUrl: {type: String, default: "/img/profile.png"},
    location: { type: {
            countryCode: String,
            country: String
        }
    },
    publicProfileUrl: {type: String},
    role: {
        type: [{
            type: String, enum: ['Admin', 'User', 'Team', 'Guest']
        }],
        default: 'Guest'
    },
    data: {
        hidden: {type: Boolean, default: false},
        extensionEnabled: {type: Boolean, default: false},
        'ip': {type: [String], default:[]}
    },
    created_at: {type: Date, default: Date.now},
    updated_at: {type: Date, default: Date.now},
    deleted_at: {type: Date, default: ''}
});


// generating a hash
userSchema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.local.password);
};

let User = mongoose.model('User', userSchema);

module.exports = User;
