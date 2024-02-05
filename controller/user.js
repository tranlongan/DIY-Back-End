const connection = require('../db')
const multer = require('multer')
const path = require('path')
const util = require('util')
const query = util.promisify(connection.query).bind(connection)

// ********************************************************************************************************************
// set up cho việc upload ảnh
// cho biết toàn bộ thông tin về file ảnh

const storage_ckeditor_image = multer.diskStorage({
    destination: 'public/upload/ckEditorImage', filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload_ckeditor_image = multer({
    storage: storage_ckeditor_image, fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('ckEditorImage');

const upload = (fieldName, destination) => {
    const storage = multer.diskStorage({
        destination: destination, filename: (req, file, cb) => {
            cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
        }
    });
    return multer({
        storage: storage, fileFilter: function (req, file, cb) {
            checkFileType(file, cb);
        }
    }).single(fieldName);
}

const uploadMultiple = (fieldName, destination) => {
    const storage = multer.diskStorage({
        destination: destination, filename: (req, file, cb) => {
            cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
        }
    });
    return multer({
        storage: storage, fileFilter: function (req, file, cb) {
            checkFileType(file, cb);
        }
    }).array(fieldName);
}

const uploadByFields = (fields) => {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            if (file.fieldname === 'image') {
                cb(null, 'public/upload/imgTitlePost');
            } else if (file.fieldname === 'images') {
                cb(null, 'public/upload/productImages');
            } else if (file.fieldname === 'background') {
                cb(null, 'public/upload/background');
            } else if (file.fieldname === 'avatar') {
                cb(null, 'public/upload/avatar');
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

// ********************************************************************************************************************

const home = (req, res) => {
    res.render('index')
}

const registerAnAccount = async (req, res) => {
    try {
        const {username, password, email, date, month, year} = req.body
        const birthday = `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;

        const checkUsername = await query(`SELECT 1
                                           FROM account
                                           WHERE username = '${username}'`)
        if (checkUsername.length > 0) {
            console.log('đã tồn tại r bạn à')
        } else {
            await query(`INSERT INTO account(id_account, username, password)
                         VALUES (null, '${username}', '${password}')`)
            await query(`INSERT INTO profiles(id_profile, id_user, fullName, email, birthday, avatar, background,
                                              introduce)
                         VALUES (null, LAST_INSERT_ID(), '${username}', '${email}', '${birthday}',
                                 'http://localhost:3001/images/avatar/avatar_default.jpg',
                                 'http://localhost:3001/images/background/background_default.jpg', null)`)
            res.json({
                msg: 'register success'
            })
        }

    } catch (e) {
        console.log(e)
    }
}

const login = async (req, res) => {
    try {
        const {username, password} = req.body
        const checkAccount = await query(`SELECT 1
                                          FROM account
                                          WHERE username = '${username}'
                                            AND password = '${password}'`)
        if (checkAccount.length > 0) {
            const profile = await query(`SELECT profiles.*, account.username
                                         FROM profiles
                                                  INNER JOIN account ON profiles.id_user = account.id_account
                                         WHERE account.username = '${username}'`)
            res.json({
                status: "login success", profile: profile
            })
        } else {
            res.json({
                status: "login fail", profile: undefined
            })
        }
    } catch (e) {
        console.log(e)
    }
}

const personalInformation = async (req, res) => {
    try {
        const {id_account} = req.body
        const infoUser = await query(`SELECT profiles.*, account.username
                                      FROM profiles
                                               INNER JOIN account ON profiles.id_user = account.id_account
                                      WHERE profiles.id_user = '${id_account}'`)
        res.json({
            infoUser: infoUser
        })
    } catch (e) {
        console.log(e)
    }
}

const uploadImgOfEditor = async (req, res) => {
    try {
        upload_ckeditor_image(req, res, () => {
            res.json({url: `upload/ckEditorImage/${req.file.filename}`})
        })
    } catch (e) {
        console.log(e)
    }
}

const uploadProduct = async (req, res) => {
    try {
        const {
            idUser,
            nameProject,
            nameProducts,
            ckeditorData,
            priceProducts,
            linkProducts,
            idProject,
            idCategory
        } = req.body

        const now = new Date();

        const datePost = now.getFullYear() + '-' +
            ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
            ('0' + now.getDate()).slice(-2) + ' ' +
            ('0' + now.getHours()).slice(-2) + ':' +
            ('0' + now.getMinutes()).slice(-2) + ':' +
            ('0' + now.getSeconds()).slice(-2);

        const sql = `INSERT INTO posts (id_post, id_of_user, id_of_project, id_of_category, title_post,
                                        illustration_post,
                                        ckeditor, date_post)
                     VALUES (null, ?, ?, ?, ?, ?, ?, ?)`
        const sql_ = await query(sql, [idUser, idProject, idCategory, nameProject, `http://localhost:3001/upload/imgTitlePost/${req.files.image[0].filename}`, ckeditorData, datePost])
        const lastId = sql_.insertId

        if (nameProducts) {
            for (const element of nameProducts) {
                const index = nameProducts.indexOf(element);
                await query(`INSERT INTO products_in_posts (id_product, id_of_post, illustration_product, name_product,
                                                            product_price, link_product)
                             VALUES (null, '${lastId}',
                                     'http://localhost:3001/upload/productImages/${req.files.images[index].filename}',
                                     '${nameProducts[index]}', '${priceProducts[index]}', '${linkProducts[index]}')`)
            }
        }
        res.json(
            {
                msg: 'ok'
            }
        )
    } catch (e) {
        console.log(e)
    }
}

const getProjects = async (req, res) => {
    try {
        const projects = await query(`SELECT *
                                      FROM projects`)
        let a = []
        for (const project of projects) {
            const projects = []
            const categories = []
            let objProject = {}
            projects.push(project)
            const category_project = await query(`SELECT *
                                                  FROM project_categories
                                                  WHERE id_of_project = '${project.id_project}'`)
            for (const categoryProjectElement of category_project) {
                categories.push(categoryProjectElement)
            }
            objProject = {projects: projects, categories: categories}
            a.push(objProject)
        }

        res.json({
            projects: a
        })
    } catch (e) {
        console.log(e)
    }
}

const exploreProject = async (req, res) => {
    try {
        const {id_project} = req.query
        const projects = await query(`SELECT *
                                      FROM projects
                                      WHERE id_project = '${id_project}'`)
        let b = []
        for (const project of projects) {
            // const categories = []
            let objProject = {}
            const category_project = await query(`SELECT *
                                                  FROM project_categories
                                                  WHERE id_of_project = '${project.id_project}'`)
            // for (const categoryProjectElement of category_project) {
            //     categories.push(categoryProjectElement)
            // }
            objProject = {projects: project, categories: category_project}
            b.push(objProject)
        }
        res.json({exploreProject: b})
    } catch (e) {
        console.log(e)
    }
}

const howTo = async (req, res) => {
    try {
        const {id_category} = req.query
        const howTo = await query(`SELECT *
                                   FROM how_to
                                   WHERE id_of_prj_category = '${id_category}'`)
        let c = []
        for (const howToElement of howTo) {
            let objStages = {}
            const stages = await query(`SELECT *
                                        FROM stage_steps
                                        WHERE id_of_stage = '${howToElement.id_how_to}'`)
            objStages = {howTo: howToElement, stages: stages}
            c.push(objStages)
        }
        res.json({howTo: c})
    } catch (e) {
        console.log(e)
    }
}

const getPosts = async (req, res) => {
    try {
        const {page} = req.query
        const page_ = page * 15
        const numberPage_ = await query(`SELECT *
                                         FROM posts`)
        const posts = await query(`SELECT *
                                   FROM posts LIMIT 15
                                   OFFSET ${page_}`)
        console.log(numberPage_.length)
        const numberPage = Math.ceil(numberPage_.length / 15)
        const arr = []
        for (const post of posts) {
            let obj = {}
            const nameUser = await query(`SELECT account.*, profiles.*
                                          FROM account
                                                   INNER JOIN profiles ON account.id_account = profiles.id_user
                                          WHERE account.id_account = '${post.id_of_user}'`)

            obj = {
                nameUser: nameUser[0].username,
                avatar: nameUser[0].avatar,
                fullName: nameUser[0].fullName,
                post: post
            }
            arr.push(obj)
        }
        res.json({
            infoPosts: arr,
            numberPage: numberPage
        })
    } catch (e) {
        console.log(e)
    }
}

const getPost = async (req, res) => {
    try {
        const {idPost} = req.query
        const posts = await query(`SELECT *
                                   FROM posts
                                   WHERE id_post = '${idPost}'`)
        const arr = []
        for (const post of posts) {
            let obj = {}
            const productsInPosts = await query(`SELECT *
                                                 FROM products_in_posts
                                                 WHERE id_of_post = '${post.id_post}'`)
            // const infoUser = await query(`SELECT id_account, username
            //                               FROM account
            //                               WHERE id_account = '${post.id_of_user}'`)
            const infoUser = await query(`SELECT account.id_account, account.username, profiles.*
                                          FROM account
                                                   INNER JOIN profiles ON account.id_account = profiles.id_user
                                          WHERE account.id_account = '${post.id_of_user}'`)
            obj = {infoUser: infoUser, post: post, productsInPosts: productsInPosts}
            arr.push(obj)
        }

        res.json({
            posts: arr
        })
    } catch (e) {
        console.log(e)
    }
}

const getProjects1 = async (req, res) => {
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

const getCategories = async (req, res) => {
    try {
        const {idProject} = req.query
        const categories = await query(`SELECT *
                                        FROM project_categories
                                        WHERE id_of_project = '${idProject}'`)
        res.json({
            categories: categories
        })
    } catch (e) {
        console.log(e)
    }
}

const getProfiles = async (req, res) => {
    const {idUser} = req.query
    try {
        const profile = await query(`SELECT account.username, profiles.*
                                     FROM account
                                              INNER JOIN profiles ON account.id_account = profiles.id_user
                                     WHERE id_account = '${idUser}'`)
        res.json({
            profile: profile
        })
    } catch (e) {
        console.log(e)
    }
}

const getPostsById = async (req, res) => {
    try {
        const {idUser} = req.query
        const posts = await query(`SELECT *
                                   FROM posts
                                   WHERE id_of_user = '${idUser}'`)
        res.json({
            posts: posts
        })
    } catch (e) {
        console.log(e)
    }
}

const editBackground = async (req, res) => {
    const {idUser} = req.body
    try {
        await query(`UPDATE profiles
                     SET background = 'http://localhost:3001/upload/background/${req.files.background[0].filename}'
                     WHERE id_user = '${idUser}'`)
        res.json(
            {
                msg: 'edit success'
            }
        )
    } catch (e) {
        console.log(e)
    }
}

const editAvatar = async (req, res) => {
    const {idUser} = req.body
    try {
        await query(`UPDATE profiles
                     SET avatar = 'http://localhost:3001/upload/avatar/${req.files.avatar[0].filename}'
                     WHERE id_user = '${idUser}'`)
        res.json(
            {
                msg: 'edit success'
            }
        )
    } catch (e) {
        console.log(e)
    }
}

const editName = async (req, res) => {
    try {
        const {name, idUser} = req.query
        await query(`UPDATE profiles
                     SET fullName = '${name}'
                     WHERE id_user = '${idUser}'`)
        res.json(
            {
                msg: 'edit success'
            }
        )
    } catch (e) {
        console.log(e)
    }
}

const getProduct = async (req, res) => {
    try {
        const {idProduct} = req.query
        const product = await query(`SELECT *
                                     FROM products_in_posts
                                     WHERE id_product = '${idProduct}'`)
        res.json({
            product: product
        })
    } catch (e) {
        console.log(e)
    }
}

const editPostStage1 = async (req, res) => {
    try {
        const {idPost} = req.query
        const {nameProject, ckeditor, image} = req.body

        const sql = `UPDATE posts
                     SET title_post        = ?,
                         illustration_post = ?,
                         ckeditor          = ?
                     WHERE id_post = '${idPost}'`

        if (req.files.image === undefined) {
            await query(sql, [nameProject, image, ckeditor])
        } else {
            await query(sql, [nameProject, `http://localhost:3001/upload/imgTitlePost/${req.files.image[0].filename}`, ckeditor])
        }
        res.json({
            msg: 'edit success'
        })
    } catch (e) {
        console.log(e)
    }
}

const editPostStage2 = async (req, res) => {
    try {
        const {idProduct} = req.query
        const {nameProduct, price, linkProduct, images} = req.body

        const sql = `UPDATE products_in_posts
                     SET illustration_product = ?,
                         name_product         = ?,
                         product_price        = ?,
                         link_product         = ?
                     WHERE id_product = '${idProduct}'`

        if (req.files.images === undefined) {
            await query(sql, [images, nameProduct, price, linkProduct])
        } else {
            await query(sql, [`http://localhost:3001/upload/productImages/${req.files.images[0].filename}`, nameProduct, price, linkProduct])
        }

        res.json({
            msg: 'edit success'
        })
    } catch (e) {
        console.log(e)
    }
}

const addProduct = async (req, res) => {
    try {
        const {idPost} = req.query
        const {nameProduct, price, linkProduct} = req.body
        const sql = `INSERT INTO products_in_posts(id_product, id_of_post, illustration_product,
                                                   name_product, product_price, link_product)
                     VALUES (null, ?, ?, ?, ?, ?)`
        await query(sql, [idPost, `http://localhost:3001/upload/productImages/${req.files.images[0].filename}`, nameProduct, price, linkProduct])
        res.json(
            {
                msg: 'add success'
            })
    } catch (e) {
        console.log(e)
    }
}

const deleteProject = async (req, res) => {
    const {idPost} = req.query
    try {
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

const comment = async (req, res) => {
    try {
        const {idPost, idUser} = req.query
        const {ckeditor, dateComment} = req.body


        await query(`INSERT INTO comments(id_comment, id_of_post, id_of_user, ckeditor, date_comment)
                     VALUES (null, '${idPost}', '${idUser}', '${ckeditor}', '${dateComment}')`)
        res.json({
            msg: 'comment success'
        })
    } catch (e) {
        console.log(e)
    }
}

const getComments = async (req, res) => {
    try {
        const {idPost} = req.query
        const arr = []
        // const comments = await query(`SELECT *
        //                               FROM comments
        //                               WHERE id_of_post = '${idPost}'`)
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
            comments: arr
        })
    } catch (e) {
        console.log(e)
    }
}

const deleteComment = async (req, res) => {
    try {
        const {idComment} = req.query
        await query(`DELETE
                     FROM comments
                     WHERE id_comment = '${idComment}'`)
        res.json({
            msg: 'delete success'
        })
    } catch (e) {
        console.log(e)
    }
}

const editComment = async (req, res) => {
    try {
        const {idComment} = req.query
        const {editorData} = req.body
        await query(`UPDATE comments
                     SET ckeditor = '${editorData}'
                     WHERE id_comment = '${idComment}'`)
        res.json({
            msg: 'edit success'
        })
    } catch (e) {
        console.log(e)
    }
}

const reply = async (req, res) => {
    try {
        const {idComment, idUser} = req.query
        const {ckeditor, date, month, year} = req.body
        const dateComment = `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;

        await query(`INSERT INTO replies(id_reply, id_of_comment, id_of_user, ckeditor_reply, date_reply)
                     VALUES (null, '${idComment}', '${idUser}', '${ckeditor}', '${dateComment}')`)
        res.json({
            msg: 'reply success'
        })
    } catch (e) {
        console.log(e)
    }
}

const editReply = async (req, res) => {
    try {
        const {idReply} = req.query
        const {editorData} = req.body
        await query(`UPDATE replies
                     SET ckeditor_reply = '${editorData}'
                     WHERE id_reply = '${idReply}'`)
        res.json({
            msg: 'edit success'
        })
    } catch (e) {
        console.log(e)
    }
}

const deleteReply = async (req, res) => {
    try {
        const {idReply} = req.query
        await query(`DELETE
                     FROM replies
                     WHERE id_reply = '${idReply}'`)
        res.json({
            msg: 'delete success'
        })
    } catch (e) {
        console.log(e)
    }
}

const getPostsByIdProject = async (req, res) => {
    try {
        const {idProject} = req.query
        const posts = await query(`SELECT posts.*, profiles.*
                                   FROM posts
                                            INNER JOIN profiles ON posts.id_of_user = profiles.id_user
                                   WHERE posts.id_of_project = '${idProject}'`)
        res.json({
            postsByIdProject: posts
        })
    } catch (e) {
        console.log(e)
    }
}

const getPostsByIdCategory = async (req, res) => {
    try {
        const {idCategory} = req.query
        const posts = await query(`SELECT posts.*, profiles.*
                                   FROM posts
                                            INNER JOIN profiles ON posts.id_of_user = profiles.id_user
                                   WHERE posts.id_of_category = '${idCategory}'`)
        res.json({
            postsByIdCategory: posts
        })
    } catch (e) {
        console.log(e)
    }
}

const getPostsByIdUser = async (req, res) => {
    try {
        const {idUser} = req.query
        const posts = await query(`SELECT posts.*, profiles.*
                                   FROM posts
                                            INNER JOIN profiles ON posts.id_of_user = profiles.id_user
                                   WHERE posts.id_of_user = '${idUser}' LIMIT 6`)
        res.json({
            postsByIdUser: posts
        })
    } catch (e) {
        console.log(e)
    }
}

const notification = async (req, res) => {
    try {
        let users = {}
        const {commentData} = req.body
        console.log(commentData)
        global.io.emit('comment-notification', commentData);
    } catch (e) {
        console.log(e)
    }
}

const addNotification = async (req, res) => {
    try {

    } catch (e) {
        console.log(e)
    }
}
module.exports = {
    home,
    registerAnAccount,
    login,
    personalInformation,
    uploadImgOfEditor,
    uploadProduct,
    uploadByFields,
    upload,
    uploadMultiple,
    getProjects,
    exploreProject,
    howTo,
    getPosts,
    getPost,
    getProjects1,
    getCategories,
    getProfiles,
    getPostsById,
    editBackground,
    editAvatar,
    editName,
    getProduct,
    editPostStage1,
    editPostStage2,
    addProduct,
    deleteProject,
    comment,
    getComments,
    deleteComment,
    editComment,
    reply,
    editReply,
    deleteReply,
    getPostsByIdProject,
    getPostsByIdCategory,
    getPostsByIdUser,
    notification,
    addNotification
}