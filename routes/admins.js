const express = require('express');
const router = express.Router();
const controller = require('../controller/admin')


/* GET */
router.get('/', controller.home)
router.get('/getUser', controller.getUsers)
router.get('/getUserById', controller.getUserById)
router.get('/getProjects', controller.getProjects)
router.get('/getPosts', controller.getPosts)
router.get('/getPost', controller.getPost)
router.get('/getRank', controller.getRank)
router.get('/getTotal', controller.getTotal)

/* POST */
router.post('/login', controller.login)
router.post('/addProject', controller.uploadByFields([{name: 'imgProject', maxCount: 1}]), controller.addProject)
router.post('/deletePost', controller.deletePost)
router.post('/deleteAccount', controller.deleteAccount)

module.exports = router;