/**
 * Created by rakesh on 15/6/17.
 */
"use strict";

const express = require('express');
const router = express.Router();

const controller = require('./company.controller');
router.get('/', controller.findCompany);


module.exports = router;