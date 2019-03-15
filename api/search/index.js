var express = require('express');
const controller = require('./search.controller');

var router = express.Router();

router.get('/', controller.searchProfile);

module.exports = router;