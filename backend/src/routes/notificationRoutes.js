const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/', notificationController.listForUser);
router.patch('/:id/read', notificationController.markRead);

module.exports = router;
