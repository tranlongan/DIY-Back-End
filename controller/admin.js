const connection = require('../db')
const multer = require('multer')
const path = require('path')
const util = require('util')
const {Query} = require("mysql/lib/protocol/sequences");
const query = util.promisify(connection.query).bind(connection)

// *********************************************************************************************************************
const uploadByFields = (fields) => {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            if (file.fieldname === 'imgProject') {
                cb(null, 'public/upload/imgProject');
            } else {
                cb(new Error('Unknown field name'));
            }
        }, filename: (req, file, cb) => {
            cb(null, file.fieldname + '-' + Date.now() + Math.random() + path.extname(file.originalname));
        }
    });
    return multer({
        storage: storage, fileFilter: function (req, file, cb) {
            checkFileType(file, cb);
        }
    }).fields(fields);
}

// tạp ra function kiểm tra có phải là ảnh ko
function checkFileType(file, cb) {
    const fileTypes = /jpeg|jpg|png|webp|gif/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Only image');
    }
}

// *********************************************************************************************************************

const home = (req, res) => {
    res.render('index')
}

const login = async (req, res) => {
    try {
        const {username, password} = req.body
        const check = await query(`SELECT *
                                   FROM account_admin
                                   WHERE username = '${username}'
                                     AND password = '${password}'`)
        if (check.length > 0) {
            res.json({
                msg: 'login success', profile: check
            })
        } else {
            res.json({
                msg: 'login fail'
            })
        }
    } catch (e) {
        console.log(e)
    }
}

const getUsers = async (req, res) => {
    try {
        const users = await query(`SELECT account.*, profiles.*
                                   FROM account
                                            INNER JOIN profiles ON account.id_account = profiles.id_user`)
        res.json({
            users: users
        })
    } catch (err) {
        console.log(err)
    }
}

const getUserById = async (req, res) => {
    try {
        const {idUser} = req.query
        const user = await query(`SELECT account.*, profiles.*
                                  FROM account
                                           INNER JOIN profiles ON account.id_account = profiles.id_user
                                  WHERE account.id_account = '${idUser}'`)
        const posts = await query(`SELECT *
                                   FROM posts
                                   WHERE id_of_user = '${idUser}'`)
        res.json({
            user: user, posts: posts
        })
    } catch (e) {
        console.log(e)
    }
}

const getProjects = async (req, res) => {
    try {
        const projects = await query(`SELECT *
                                      FROM projects`)
        res.json({
            projects: projects
        })
    } catch (e) {
        console.log(e)
    }
}

const addProject = async (req, res) => {
    try {
        const {nameProject, description} = req.body
        await query(`INSERT INTO projects(id_project, name_project, img_project, description_project)
                     VALUES (null, '${nameProject}',
                             'http://localhost:3001/upload/imgProject/${req.files.imgProject[0].filename}',
                             '${description}')`)
        res.json({
            msg: 'add success'
        })
    } catch (e) {
        console.log(e)
    }
}

const getPosts = async (req, res) => {
    try {
        const posts = await query(`SELECT posts.*, profiles.*
                                   FROM posts
                                            INNER JOIN profiles ON posts.id_of_user = profiles.id_user`)
        res.json({
            posts: posts
        })
    } catch (e) {
        console.log(e)
    }
}

const getPost = async (req, res) => {
    try {
        const {idPost} = req.query
        const arr = []
        const post = await query(`SELECT posts.*, profiles.*
                                  FROM posts
                                           INNER JOIN profiles ON posts.id_of_user = profiles.id_user
                                  WHERE posts.id_post = '${idPost}'`)
        const products = await query(`SELECT *
                                      FROM products_in_posts
                                      WHERE id_of_post = '${idPost}'`)
        const comments = await query(`SELECT comments.*, profiles.*
                                      FROM comments
                                               INNER JOIN profiles ON comments.id_of_user = profiles.id_user
                                      WHERE comments.id_of_post = '${idPost}'`)
        for (const comment of comments) {
            const replies = await query(`SELECT replies.*, profiles.*
                                         FROM replies
                                                  INNER JOIN profiles ON replies.id_of_user = profiles.id_user
                                         WHERE replies.id_of_comment = '${comment.id_comment}'`)
            arr.push({comment, replies})
        }
        res.json({
            post: post, products: products, comments: arr
        })
    } catch (e) {
        console.log(e)
    }
}

const deletePost = async (req, res) => {
    try {
        const {idPost} = req.query
        await query(`DELETE
                     FROM posts
                     WHERE id_post = '${idPost}'`)
        res.json({
            msg: 'delete success'
        })
    } catch (e) {
        console.log(e)
    }
}

const getRank = async (req, res) => {
    try {
        const rank = []
        const profiles = await query(`SELECT *
                                      FROM profiles`)
        for (const profile of profiles) {
            const arrPosts = []
            const posts = await query(`SELECT *
                                       FROM posts
                                       WHERE id_of_user = '${profile.id_user}'`)
            for (const post of posts) {
                arrPosts.push({idPost: post.id_post, datePost: post.date_post})
            }
            rank.push({
                profile: {id_user: profile.id_user, fullName: profile.fullName},
                posts: arrPosts,
                totalPost: posts.length
            })
        }
        res.json({
            rank: rank
        })
    } catch (e) {
        console.log(e)
    }
}

const deleteAccount = async (req, res) => {
    try {
        const {idUser} = req.query
        const deleteReply = await query(`DELETE
                                         FROM replies
                                         WHERE id_of_user = '${idUser}'`)
        const deleteComment = await query(`DELETE
                                           FROM comments
                                           WHERE id_of_user = '${idUser}'`)
        const deletePost = await query(`DELETE
                                        FROM posts
                                        WHERE id_of_user = '${idUser}'`)
        const idProduct = await query(`SELECT *
                                       FROM posts
                                       WHERE id_of_user = '${idUser}'`)
        for (const idProductElement of idProduct) {
            const deletePost = await query(`DELETE
                                            FROM products_in_posts
                                            WHERE id_of_user = '${idUser}'`)
        }
        const deleteProfile = await query(`DELETE
                                           FROM profiles
                                           WHERE id_user = '${idUser}'`)
        const deleteAccount = await query(`DELETE
                                           FROM account
                                           WHERE id_account = '${idUser}'`)

        res.json({
            msg: 'delete success'
        })
    } catch (e) {
        console.log(e)
    }
}

const getTotal = async (req, res) => {
    try {
        const total = []
        const totalAccounts = await query(`SELECT *
                                           FROM account`)
        const totalPosts = await query(`SELECT *
                                        FROM posts`)
        const totalProjects = await query(`SELECT *
                                           FROM projects`)
        const totalCategories = await query(`SELECT *
                                             FROM project_categories`)
        total.push({
            totalAccounts: totalAccounts.length,
            totalPosts: totalPosts.length,
            totalProjects: totalProjects.length,
            totalCategories: totalCategories.length
        })
        res.json({
            total: total
        })
    } catch (e) {
        console.log(e)
    }
}


module.exports = {
    uploadByFields,
    home,
    login,
    getUsers,
    getUserById,
    getProjects,
    addProject,
    getPosts,
    getPost,
    deletePost,
    getRank,
    deleteAccount,
    getTotal
}