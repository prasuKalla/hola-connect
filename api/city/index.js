/**
 * Created by rakesh on 19/6/17.
 */
"use strict";

const express = require('express');
const router = express.Router();

const controller = require('./city.controller');
const AuthController = require('../../auth/auth.controller');
router.get('/', controller.findCompany);


module.exports = router;