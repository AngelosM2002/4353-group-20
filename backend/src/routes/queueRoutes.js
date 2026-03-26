const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');

router.post('/join', queueController.joinQueue);
router.post('/leave', queueController.leaveQueue); 
router.get('/status', queueController.getUserStatus);

module.exports = router;