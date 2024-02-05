const express = require('express');
const router = express.Router();
const controller = require('../controller/user')
const {uploadByFields} = require("../controller/user");
const socketModule = require('../socket');


/* GET */
router.get('/', controller.home)
router.get('/getProjects', controller.getProjects)
router.get('/exploreProject', controller.exploreProject)
router.get('/howTo', controller.howTo)
router.get('/getPosts', controller.getPosts)
router.get('/getPost', controller.getPost)
router.get('/getProjects1', controller.getProjects1)
router.get('/getCategories', controller.getCategories)
router.get('/getProfiles', controller.getProfiles)
router.get('/getPostsById', controller.getPostsById)
router.get('/getProduct', controller.getProduct)
router.get('/getComments', controller.getComments)
router.get('/getPostsByIdProject', controller.getPostsByIdProject)
router.get('/getPostsByIdCategory', controller.getPostsByIdCategory)
router.get('/getPostsByIdUser', controller.getPostsByIdUser)
router.get('/notification')


/* POST */
router.post('/registerAnAccount', controller.registerAnAccount)
router.post('/login', controller.login)
router.post('/getInfoUser', controller.personalInformation)
router.post('/uploadImgOfEditor', controller.uploadImgOfEditor)
router.post('/uploadProducts', uploadByFields([{name: 'image', maxCount: 1}, {
    name: 'images', maxCount: 100
}]), controller.uploadProduct)
router.post('/editBackground', uploadByFields([{name: 'background', maxCount: 1}]), controller.editBackground)
router.post('/editAvatar', uploadByFields([{name: 'avatar', maxCount: 1}]), controller.editAvatar)
router.post('/editName', controller.editName)
router.post('/editPostStage1', uploadByFields([{name: 'image', maxCount: 1}]), controller.editPostStage1)
router.post('/editPostStage2', uploadByFields([{name: 'images', maxCount: 1}]), controller.editPostStage2)
router.post('/addProduct', uploadByFields([{name: 'images', maxCount: 1}]), controller.addProduct)
router.post('/deleteProject', controller.deleteProject)
router.post('/comment', controller.comment)
router.post('/deleteComment', controller.deleteComment)
router.post('/editComment', controller.editComment)
router.post('/reply', controller.reply)
router.post('/editReply', controller.editReply)
router.post('/deleteReply', controller.deleteReply)
router.post('/addNotification')

module.exports = router;
