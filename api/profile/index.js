'use strict';
var express = require('express');
var router = express.Router();

var controller = require('./profile.controller');
let AuthController = require('../../auth/auth.controller');

router.get('/info/:profileId',AuthController.ensureAuth, controller.getProfileInfo);
router.get('/:link', controller.showProfile);
router.get('/predicted/:profileId', AuthController.ensureAuth,controller.showReconciled);
router.post('/similarProfiles', controller.similarProfiles);

module.exports = router;

