const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');

router.get(
    '/admin/:serviceId',
    queueController.requireAdmin,
    queueController.getAdminQueue
);
router.post(
    '/admin/:serviceId/serve-next',
    queueController.requireAdmin,
    queueController.serveNext
);

router.post('/join', queueController.joinQueue);
router.post('/leave', queueController.leaveQueue);
router.get('/status', queueController.getUserStatus);

module.exports = router;