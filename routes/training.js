const express = require('express');
const router = express.Router();
const controller = require('../controller/training')

// GET
router.get('/', controller.home)
router.get('/trainedData', controller.data)
router.get('/tokenizer', controller.tokenizer)

// POST
router.post('/insert', controller.insert)
router.post('/forecast', controller.forecast)


module.exports = router