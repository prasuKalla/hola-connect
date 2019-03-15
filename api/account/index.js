"use strict";

const express = require('express');
const router = express.Router();

const controller = require('./account.controller');
const AuthController = require('../../auth/auth.controller');


router.get('/', AuthController.ensureAuth, controller.getUserAccount);
router.get('/cancelsubscription',AuthController.ensureAuth,controller.cancelSubscription);

module.exports = router;