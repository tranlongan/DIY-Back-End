const socketIo = require('socket.io');
const util = require("util");
const connection = require("./db");
const dateAndTime = require('date-and-time');

let io;
let userSockets = {};

const query = util.promisify(connection.query).bind(connection)

const init = (server) => {
    io = socketIo(server);
    io.on('connection', (socket) => {
        // sự kiện đăng nhập
        socket.on('user-login', async (user) => {
            const checkAccount = await query(`SELECT 1
                                              FROM account
                                              WHERE username = '${user.username}'
                                                AND password = '${user.password}'`)
            if (checkAccount.length > 0) {
                const profile = await query(`SELECT profiles.*, account.username
                                             FROM profiles
                                                      INNER JOIN account ON profiles.id_user = account.id_account
                                             WHERE account.username = '${user.username}'`)
                io.emit('login-success', profile);
                userSockets[profile[0]?.id_user] = socket.id;
                console.log(userSockets)
            } else {
                io.emit('login-fail');
            }
        });

        //đang online
        socket.on('user-online', (userId) => {
            io.emit('user-online', userSockets[userId])
        })

        // Lắng nghe sự kiện đăng xuất để xóa socket.id
        socket.on('user-logout', (ID_SELF) => {
            delete userSockets[ID_SELF];
            io.emit('user-logout-success')
        });

        //sự kiện bình luận
        socket.on('new-comment', async (commentData) => {
            const {idSender, idPost, idAuthor, editorData, titlePost, dateComment, fullName} = commentData;
            console.log(titlePost)
            const dateTime = new Date(dateComment);
            const formattedDateTime = dateAndTime.format(dateTime, 'YYYY-MM-DD HH:mm:ss');
            await query(`INSERT INTO comments(id_comment, id_of_post, id_of_user, ckeditor, date_comment)
                         VALUES (null, '${idPost}', '${idSender}', '${editorData}', '${formattedDateTime}')`)
            io.emit(`comment-success`);
        });

        // lấy danh sách bình luận
        socket.on('update-comment', async (idPost) => {
            const arrComments = []
            const comments = await query(`SELECT comments.*, profiles.*
                                          FROM comments
                                                   INNER JOIN profiles ON comments.id_of_user = profiles.id_user
                                          WHERE comments.id_of_post = '${idPost}'`)
            for (const comment of comments) {
                const replies = await query(`SELECT replies.*, profiles.*
                                             FROM replies
                                                      INNER JOIN profiles ON replies.id_of_user = profiles.id_user
                                             WHERE replies.id_of_comment = '${comment.id_comment}'`)
                arrComments.push({comment, replies})
            }

            io.emit('update-comment-success', arrComments);
        })

        //sự kiện reply
        socket.on('new-reply', async (replyData) => {
            const {idComment, idUser, ckeditor, dateReply} = replyData
            await query(`INSERT INTO replies(id_reply, id_of_comment, id_of_user, ckeditor_reply, date_reply)
                         VALUES (null, '${idComment}', '${idUser}', '${ckeditor}', '${dateReply}')`)
            socket.emit('reply-success')
        })

        // sự kiện thêm thông báo cmt
        socket.on(`add-notification-comment`, async (ntfCmtData) => {
            const {idSender, idPost, idAuthor, editorData, titlePost, dateComment} = ntfCmtData;
            console.log(idSender + "và" + idAuthor)
            if (idSender !== idAuthor) {
                await query(`INSERT INTO notification_comments(id_notification, id_sender, id_author, id_of_post,
                                                               title_post,
                                                               date_comment, clicked)
                             VALUES (null, '${idSender}', '${idAuthor}', '${idPost}', '${titlePost}', '${dateComment}',
                                     0)`)
                socket.emit('add-ntf-cmt-success')
            }
        });

        //sự kiện thêm thông báo reply
        socket.on(`add-notification-reply`, async (replyData1) => {
            const {idResponder, idPost, idComment, titlePost, dateReply} = replyData1;
            const user = await query(`SELECT id_of_user
                                      FROM comments
                                      WHERE id_comment = '${idComment}'`)
            if (idResponder !== user[0]?.id_of_user) {
                await query(`INSERT INTO notification_replies(id_ntf_reply, id_author, id_post, id_responder,
                                                              id_of_comment,
                                                              title_post, date_reply, clicked)
                             VALUES (null, '${user[0]?.id_of_user}', '${idPost}', '${idResponder}', '${idComment}',
                                     '${titlePost}', '${dateReply}',
                                     0)`)
                socket.emit('add-ntf-reply-success')
            }
        })

        // update list comments
        socket.on(`update-notification`, async (ID_SELF) => {
            const notificationCmt = await query(`SELECT notification_comments.*,
                                                        profiles.*,
                                                        posts.id_of_project,
                                                        projects.name_project
                                                 FROM notification_comments
                                                          INNER JOIN profiles ON notification_comments.id_sender = profiles.id_user
                                                          INNER JOIN posts ON notification_comments.id_of_post = posts.id_post
                                                          INNER JOIN projects ON posts.id_of_project = projects.id_project
                                                 WHERE notification_comments.id_author = '${ID_SELF}'`)
            for (const notificationCmtElement of notificationCmt) {
                socket.emit(`update-notification-success${notificationCmtElement.id_author}`, notificationCmt)
            }
        })

        // update list replies
        socket.on(`update-ntf-reply`, async (ID_SELF) => {
            const notificationReply = await query(`SELECT notification_replies.*,
                                                          profiles.*,
                                                          posts.id_of_project,
                                                          projects.name_project
                                                   FROM notification_replies
                                                            INNER JOIN profiles ON notification_replies.id_responder = profiles.id_user
                                                            INNER JOIN posts ON notification_replies.id_post = posts.id_post
                                                            INNER JOIN projects ON posts.id_of_project = projects.id_project
                                                   WHERE notification_replies.id_author = '${ID_SELF}'`)
            for (const notificationReplyElement of notificationReply) {
                socket.emit(`update-ntf-reply-success${notificationReplyElement.id_author}`, notificationReply)
            }
        })

        // update number ntf
        socket.on(`update-number-ntf`, async (ID_SELF) => {
            const notificationCmt = await query(`SELECT *
                                                 FROM notification_comments
                                                 WHERE id_author = '${ID_SELF}'
                                                   AND clicked = 0`)

            for (const notificationCmtElement of notificationCmt) {
                // if (notificationCmtElement.id_author !== ID_SELF) {
                socket.emit(`update-number-ntf-success${notificationCmtElement.id_author}`, notificationCmt.length)
                // }
            }

        })

        // update number ntf
        socket.on(`update-number-ntf-reply`, async (ID_SELF) => {
            const notificationReply = await query(`SELECT *
                                                   FROM notification_replies
                                                   WHERE id_author = '${ID_SELF}'
                                                     AND clicked = 0`)

            for (const notificationReplyElement of notificationReply) {
                socket.emit(`update-number-ntf-reply-success${notificationReplyElement.id_author}`, notificationReply.length)

            }
        })
        //view ntf
        socket.on('view-ntf', async (idNtf) => {
            await query(`UPDATE notification_comments
                         SET clicked = 1
                         WHERE id_notification = '${idNtf}'`)
            socket.emit('saw-the-ntf')
        })

        //view ntf reply
        socket.on('view-ntf-reply', async (idNtf) => {
            await query(`UPDATE notification_replies
                         SET clicked = 1
                         WHERE id_ntf_reply = '${idNtf}'`)
            socket.emit('saw-the-ntf-reply')
        })
    });
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = {init, getIo};

