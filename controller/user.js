const connection = require('../db')
const multer = require('multer')
const path = require('path')
const util = require('util')
const query = util.promisify(connection.query).bind(connection)

// ********************************************************************************************************************
// set up cho việc upload ảnh
// cho biết toàn bộ thông tin về file ảnh
const storage_ckeditor_image = multer.diskStorage({
    destination: 'public/upload/ckEditorImage',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// tạo ra function upload
const upload_ckeditor_image = multer({
    storage: storage_ckeditor_image,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('ckEditorImage');

const upload = (fieldName, destination) => {
    const storage = multer.diskStorage({
        destination: destination,
        filename: (req, file, cb) => {
            cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
        }
    });
    return multer({
        storage: storage,
        fileFilter: function (req, file, cb) {
            checkFileType(file, cb);
        }
    }).single(fieldName);
}

const uploadMultiple = (fieldName, destination) => {
    const storage = multer.diskStorage({
        destination: destination,
        filename: (req, file, cb) => {
            cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
        }
    });
    return multer({
        storage: storage,
        fileFilter: function (req, file, cb) {
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
            } else {
                cb(new Error('Unknown field name'));
            }
        },
        filename: (req, file, cb) => {
            cb(null, file.fieldname + '-' + Date.now() + Math.random() + path.extname(file.originalname));
        }
    });
    return multer({
        storage: storage,
        fileFilter: function (req, file, cb) {
            checkFileType(file, cb);
        }
    }).fields(fields);
}

// tạp ra function kiểm tra có phải là ảnh ko
function checkFileType(file, cb) {
    const fileTypes = /jpeg|jpg|png|gif/;
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
            await query(`INSERT INTO profiles(id_profile, id_user, email, birthday, avatar, background)
                         VALUES (null, LAST_INSERT_ID(), '${email}', '${birthday}',
                                 'http://localhost:3001/images/avatar/avatar_default.jpg',
                                 'http://localhost:3001/images/background/background_default.jpg')`)
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
                status: "login success",
                profile: profile
            })
        } else {
            res.json({
                status: "login fail",
                profile: undefined
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
        const {nameProduct} = req.body
        const products = []

        nameProduct.forEach((element, index) => {
            products.push({nameProduct: element, imgPrd: req.files.images[index].filename})
        })
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
        res.json(
            {exploreProject: b}
        )
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
        res.json(
            {howTo: c}
        )
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
    howTo
}