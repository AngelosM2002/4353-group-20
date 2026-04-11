const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

//endpoints
router.post('/', serviceController.createService); //create
router.get('/', serviceController.getServices); //list
router.put('/:id', serviceController.updateService); //update
router.delete('/:id', serviceController.deleteService); //delete


module.exports = router;
