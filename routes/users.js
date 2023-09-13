const express = require('express');
const router = express.Router();
const controller = require('../controller/user')
const {uploadByFields, upload, uploadMultiple} = require("../controller/user");


/* GET */
router.get('/', controller.home)
router.get('/getProjects', controller.getProjects)
router.get('/exploreProject', controller.exploreProject)
router.get('/howTo', controller.howTo)
router.get('/getPosts', controller.getPosts)
router.get('/getPost', controller.getPost)


/* POST */
router.post('/registerAnAccount', controller.registerAnAccount)
router.post('/login', controller.login)
router.post('/getInfoUser', controller.personalInformation)
router.post('/uploadImgOfEditor', controller.uploadImgOfEditor)
router.post('/uploadProducts', uploadByFields([{name: 'image', maxCount: 1}, {
    name: 'images',
    maxCount: 100
}]), controller.uploadProduct)

module.exports = router;
