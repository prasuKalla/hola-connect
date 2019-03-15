"use strict";

const express = require('express');
const passport = require('passport');

const _ = require('lodash');
const Config = require('../config/index');
const Logger = require('../lib/logger');
const AuthController = require('./auth.controller');
const AccountController = require('../api/account/account.controller');



const User = require('../models/users');

const router = express.Router();





let logout = (req, res, next) => {
    req.logout();
    req.session.destroy(function (err) {
        res.redirect('/'); //Inside a callback… bulletproof!
    });
};



let getUserProfile = (req, res) => {
    AccountController.getUserAccountMiddleware(req, res, (account) => {
        account.userName = req.user ? req.user.name : 'User';
        account.userEmail = req.user ? req.user.email[0] : 'User';
        account.extensionEnabled =  req.user.data.extensionEnabled;
        return res.status(200).json(account);
    });
};



router.get('/profile', AuthController.ensureAuth, getUserProfile);

router.get('/logout', logout);


module.exports = router;
