const connection = require('../db')
const multer = require('multer')
const path = require('path')
const util = require('util')
const query = util.promisify(connection.query).bind(connection)
const fs = require('fs')

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

// ************************************************************************************************************************

const home = (req, res) => {
    res.render('training')
}

const insert = async (req, res) => {
    try {
        const {articleName, nameProject, nameCategory, nameUser} = req.query
        const query_check = `SELECT *
                             FROM data_for_training
                             WHERE article_name = ?
                               AND name_project = ?
                               AND name_category = ?`
        const check = await query(query_check, [articleName, nameProject, nameCategory])
        // const check = await query(`SELECT *
        //                            FROM data_for_training
        //                            WHERE article_name = '${articleName}'`)
        if (check.length > 0) {
            res.json({
                msg: 'isAvailable'
            })
        } else {
            const query_insert = `INSERT INTO data_for_training(id, article_name, name_project, name_category, name_user)
                                  VALUES (null, ?, ?, ?, ?)`
            // await query(`INSERT INTO data_for_training(id, article_name, name_project, name_category, name_user)
            //              VALUES (nul, '${articleName}', '${nameProject}', '${nameCategory}', '${nameUser}')`)
            await query(query_insert, [articleName, nameProject, nameCategory, nameUser])
            res.json({
                msg: 'ok'
            })
        }
    } catch (e) {
        console.log(e)
    }
}

const data = async (req, res) => {
    const data = await query(`SELECT *
                              FROM data_for_training`)
    res.json({
        data
    })
}

const tokenizer = (req, res) => {
    fs.readFile("./public/tokenizer/tokenizer.json", "utf8", (error, data) => {
        if (error) {
            console.log(error);
            return;
        }
        res.json(
            {
                class_name: JSON.parse(data).class_name,
                config: {
                    num_words: JSON.parse(data).config.num_words,
                    filters: JSON.parse(data).config.filters,
                    lower: JSON.parse(data).config.lower,
                    split: JSON.parse(data).config.split,
                    char_level: JSON.parse(data).config.char_level,
                    oov_token: JSON.parse(data).config.oov_token,
                    document_count: JSON.parse(data).config.document_count,
                    word_counts: JSON.parse(JSON.parse(data).config.word_counts)
                }
            }
        );
    });
}

const forecast = async (req, res) => {
    try {
        const {forecast} = req.body
        const {search} = req.query
        let arrProject = []
        let arrCategory = []

        for (let parseElement of JSON.parse(forecast)) {
            if (parseElement.score > 0.2) {
                const isVariable = await query(`SELECT *
                                                FROM projects
                                                WHERE name_project = '${parseElement.class_name.toLowerCase()}'`)
                if (isVariable.length > 0) {
                    const projects = await query(`SELECT *
                                                  FROM projects
                                                  WHERE name_project = '${parseElement.class_name.toLowerCase()}'`)
                    for (const project of projects) {
                        const posts = await query(`SELECT posts.*, profiles.*
                                                   FROM posts
                                                            INNER JOIN profiles ON posts.id_of_user = profiles.id_user
                                                   WHERE id_of_project = '${project.id_project}'`)
                        for (const post of posts) {
                            arrProject.push(post)
                        }
                    }
                } else {
                    const project_categories = await query(`SELECT *
                                                            FROM project_categories
                                                            WHERE name_category = '${parseElement.class_name.toLowerCase()}'`)
                    for (const projectCategory of project_categories) {
                        const posts = await query(`SELECT posts.*, profiles.*
                                                   FROM posts
                                                            INNER JOIN profiles ON posts.id_of_user = profiles.id_user
                                                   WHERE id_of_project = '${projectCategory.id_of_project}'
                                                     AND id_of_category = '${projectCategory.id_prj_category}'`)
                        for (const post of posts) {
                            arrCategory.push(post)
                        }
                    }
                }
            }
        }

        const searchText = await query(`SELECT posts.*, profiles.*
                                        FROM posts
                                                 INNER JOIN profiles ON posts.id_of_user = profiles.id_user
                                        WHERE title_post LIKE '%${search}%'`)
        let combined = []
        if (arrProject.length === 0) {
            combined = [...arrCategory, ...searchText]
            let map = new Map(combined.map(obj => [obj.title_post, obj]));
            let unique = Array.from(map.values());
            const newArr = unique.sort((a, b) => {
                if (a.title_post === searchText[0]?.title_post) return -1;
                if (b.title_post === searchText[0]?.title_post) return 1;
                return 0;
            });
            res.json({
                arr: newArr
            })
        } else {
            combined = [...arrProject, ...searchText]
            let map = new Map(combined.map(obj => [obj.title_post, obj]));
            let unique = Array.from(map.values());
            const newArr = unique.sort((a, b) => {
                if (a.title_post === searchText[0]?.title_post) return -1;
                if (b.title_post === searchText[0]?.title_post) return 1;
                return 0;
            });
            res.json({
                arr: newArr
            })
        }

    } catch (e) {
        console.log(e)
    }
}


module.exports = {home, insert, data, tokenizer, forecast}