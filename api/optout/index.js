'use strict';
const express = require('express');
const router = express.Router();

let controller = require('./optout.controller');

router.post('/', controller.onOptout);

module.exports = router;

