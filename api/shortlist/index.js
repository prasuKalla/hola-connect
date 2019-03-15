'use strict';
let express = require('express');
let router = express.Router();

let controller = require('./shortlist.controller');
let AuthController = require('../../auth/auth.controller');

router.get('/', AuthController.ensureAuth, controller.allMyShortlists);
router.get('/:profileId', AuthController.ensureAuth, controller.getMyShortlist);
router.get('/dw/csv', AuthController.ensureAuth, controller.generateCSVurl);
router.post('/updateshortlist', AuthController.ensureAuth, controller.updateShortlist);
router.post('/maskedshortlist', AuthController.ensureAuth, controller.createMaskedShortlist);
router.put('/:shortlistId', AuthController.ensureAuth, controller.updateMyShortlist);
router.delete('/:profileId', AuthController.ensureAuth, controller.deleteMyShortlist);

module.exports = router;