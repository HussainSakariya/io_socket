// https://www.educba.com/websocket-vs-socket-io/
// https://socket.io/get-started/chat/
// https://www.tutorialspoint.com/socket.io/socket.io_logging_and_debugging.htm
// https://gitlab.com/hussainitechnotion/nodejs-practice/-/tree/master/io_socket

var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var mongodbclient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/firstmd'
var date = require('./getdate')
var path = require('path')
var session = require('express-session');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
}),
    sharedsession = require("express-socket.io-session");

// Attach session
app.use(session);


//send the message box html file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/login.html');
});

app.get('/register.html', (req, res) => {
    res.sendFile(__dirname + '/views/register.html');
});

app.get('/home.html', (req, res) => {
    mongodbclient.connect(url, function (err, db) {
        if (err) throw err;
        obj = db.db('firstmd');
        obj.collection('users').find({}, { projection: { _id: 0 } }).toArray(function (err, result) {
            if (err) throw err;
            res.render('home.html', { 'result': result, 'name': req.session.user })
            db.close()
        });
    });
});


var allusers;
var msgs=[];
var Chat_grp_id;
app.get('/index.html', function (req, res) {
    mongodbclient.connect(url, function (err, db) {
        if (err) throw err;
        obj = db.db('firstmd');
        // obj.collection('users').find(record).toArray(function (err, result) {
        //     if (err) throw err;
        //     allusers = result;

        // });

        var record = { users: { user1: req.session.user, user2: req.session.touser } }
        console.log(record);
        obj.collection('msg_grp').find(record).toArray(function (err, result) {
            if (err) throw err;
            if (result.length > 0) {
                console.log('exists', result[0]['_id'])
                Chat_grp_id = result[0]['_id']

                var query = { usergrp: Chat_grp_id }
                obj.collection('msg_tbl').find(query).toArray(function (err, result) {
                    if (err) throw err;
                    msgs = result
                    console.log(result)
                    // io.sockets.emit('showMsg',{'msgs':result})
                    
                    db.close()
                });
            } else {
                var record = { users: { user1: socket.handshake.session.touser, user2: socket.handshake.session.user } }
                obj.collection('msg_grp').find(record).toArray(function (err, result) {
                    if (err) throw err;
                    if (result.length > 0) {
                        console.log('exists', result[0]['_id'])
                        Chat_grp_id = result[0]['_id']

                        var query = { usergrp: Chat_grp_id }
                        obj.collection('msg_tbl').find(query).toArray(function (err, result) {
                            if (err) throw err;
                            msgs = result
                            console.log(result)
                            // io.sockets.emit('showMsg',{'msgs':result})
                            db.close()
                        });
                    }
                });
            }
        });
    });
    // console.log(allusers, "userrrrrrrrrr")
    console.log(msgs, "userrrrrrrrrr")
    res.render('index.html', { 'msgs':msgs ,'name': req.session.user })
});



app.get('/login.html', (req, res) => {
    res.sendFile(__dirname + '/views/login.html');
});

// Share session with io sockets
io.use(sharedsession(session));

io.on('connection', function (socket) {
    console.log('connected');

    socket.on('RegUser', function (data) {
        mongodbclient.connect(url, function (err, db) {
            if (err) throw err;
            var record = { user: data.username, pass: data.password }
            obj = db.db('firstmd');
            obj.collection('users').insertOne(record, function (err, res) {
                if (err) throw err;
                console.log('inserted')
                db.close()
            });
        });
    });


    socket.on('SetUser', function (data) {
        mongodbclient.connect(url, function (err, db) {
            if (err) throw err;
            var record = { user: data.username, pass: data.password }
            obj = db.db('firstmd');
            obj.collection('users').find(record).toArray(function (err, result) {
                if (err) throw err;

                socket.handshake.session.user = data.username;
                socket.handshake.session.save();

                socket.emit('userExistsOrNot', result)

                db.close()
            });
        });
    });

    socket.on('ChatGrp', function (data) {
        mongodbclient.connect(url, function (err, db) {
            if (err) throw err;
            var record = { users: { user1: socket.handshake.session.user, user2: data.touser } }
            console.log(record);
            obj = db.db('firstmd');
            obj.collection('msg_grp').find(record).toArray(function (err, result) {
                if (err) throw err;
                if (result.length > 0) {
                    console.log('exists', result.length)
                    socket.emit('goIndex')
                } else {
                    var record = { users: { user1: data.touser, user2: socket.handshake.session.user } }
                    obj.collection('msg_grp').find(record).toArray(function (err, result) {
                        if (err) throw err;
                        if (result.length > 0) {
                            console.log('exists', result.length)
                            socket.emit('goIndex')
                        } else {
                            var record = { users: { user1: socket.handshake.session.user, user2: data.touser } }
                            console.log(record);
                            obj.collection('msg_grp').insertOne(record, function (err, result) {
                                if (err) throw err;
                                console.log('inserted')
                                socket.emit('goIndex')
                                db.close();
                            });
                        }
                    });
                }
            });
        });

        socket.handshake.session.touser = data.touser;
        socket.handshake.session.save();
    });






    socket.on('ChatMsg', function (data) {
        mongodbclient.connect(url, function (err, db) {
            var Chat_grp_id;
            if (err) throw err;
            var record = { users: { user1: socket.handshake.session.user, user2: socket.handshake.session.touser } }
            console.log(record);
            obj = db.db('firstmd');
            obj.collection('msg_grp').find(record).toArray(function (err, result) {
                if (err) throw err;
                if (result.length > 0) {
                    console.log('exists', result[0]['_id'])
                    Chat_grp_id = result[0]['_id']

                    var record = { usergrp: Chat_grp_id, msg: data.msg, date: data.date }
                    obj.collection('msg_tbl').insertOne(record, function (err, result) {
                        if (err) throw err;
                        console.log('insert')
                        socket.emit('showMsg',{'msgs':result});
                        db.close()
                    });
                } else {
                    var record = { users: { user1: socket.handshake.session.touser, user2: socket.handshake.session.user } }
                    obj.collection('msg_grp').find(record).toArray(function (err, result) {
                        if (err) throw err;
                        if (result.length > 0) {
                            console.log('exists', result[0]['_id'])
                            Chat_grp_id = result[0]['_id']

                            var record = { usergrp: Chat_grp_id, msg: data.msg, date: data.date }
                            obj.collection('msg_tbl').insertOne(record, function (err, result) {
                                if (err) throw err;
                                console.log('insert');
                                socket.emit('showMsg',{'msgs':result});
                                db.close();
                            });
                        }
                    });
                }
            });
        });
    });

    // var record = { usergrp: , msg: data.msg ,date:data.date}
    // obj = db.db('firstmd');
    // obj.collection('users').find(record).toArray(function (err, result) {
    //     if (err) throw err;
    //     io.sockets.emit('showMsg', record)
    //     db.close()
    // });
    // db.close()
    // });

    socket.on('disconnect', function () {
        console.log('disconnect')
    });
});

http.listen('4000', () => {
    console.log('localhost:4000')
});























// local storage
// -------------------------------------------------------------------------------------------
// var users=[];
// io.on('connection',function(socket){
//     console.log('connected');

//     socket.on('SetUserName',function(username){
//         if(users.indexOf(username)>-1){
//             socket.emit('userExists')
//         }else{
//             users.push(username);
//             socket.emit('setUser',{'username':username,'users':users})
//             // cnt_client=users.length;
//             // socket.broadcast.emit('newclientconnect',{'cnt_client':cnt_client,'users':users});
//         }

//     });


//     socket.on('disconnect',function(){
//         console.log('disconnected');
//         // cnt_client=users.length;
//         // socket.broadcast.emit('newclientconnect',{'cnt_client':cnt_client,'users':users})
//     });

//     socket.on('ChatMsg',function(data){
//         io.sockets.emit('showMsg',{'user':data.user,'msg':data.msg})
//     });
// });















//-------------------------------------------------------------------------------------
// var nsp=io.of('/my-name')
// var cnt_client=0;
// io.on('connection',(socket)=>{
//     console.log('connected');
//     cnt_client+=1;

//     // socket.emit('newclientconnect',{ description: cnt_client + ' clients connected!'});  // when new user comes
//     // socket.broadcast.emit('newclientconnect',{ description: cnt_client + ' clients connected!'}) // its give totel clients to other user
//     nsp.emit('hi','welcome');
//     io.sockets.emit('brodcast',{'desc':cnt_client + ' clients connected!'});

//     socket.on('ChatMsg',(msg)=>{
//         // console.log(msg);
//         io.emit('ChatMsg',msg);
//     })
//     socket.on('disconnect',()=>{
//         console.log('disconnected');
//         cnt_client-=1;
//         io.sockets.emit('brodcast',{'desc':cnt_client + ' clients connected!'});
//         // socket.broadcast.emit('newclientconnect',{ description: cnt_client + ' clients connected!'})
//     })


// });

// //set the localhost 3000
// http.listen(3000,()=>{
//     console.log('localhost:3000')
// })

// // http.createServer(function(resquest,response){
// //     response.writeHead(200,{'ContentType':'text/html'});
// //     response.write('Hussain');
// //     response.end();
// // }).listen('8080');
