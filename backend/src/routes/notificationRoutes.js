const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/', notificationController.listForUser);
router.patch('/mark-all-read', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);

module.exports = router;
