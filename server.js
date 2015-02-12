// set-up ======================================================================
    var express  = require('express');          //used to configure server settings
    var app = require('express')();             // create our server w/ express
    var http = require('http').Server(app);     // used for socket.io
    var multer = require('multer');             // used for File-Upload
    var morgan = require('morgan');             // log requests to the console (express4)
    var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
    var walk = require('walk');                 // Used to walk recursive through folders
    var fs = require('fs');                     // Used for filesystem-access
    var uuid = require('node-uuid');            // used to generate uuid's to identify files
    var Reader = require('./readpcap.js');      // used to read a pcap-file and get the buffer back
    var Sender = require('./sender.js');        // used to send packages through network
    var io = require('socket.io')(http);        // used for sending push notifications to clients

    var uploadFolder = 'static/uploads';        // Define Upload-Folder for all Actions with Files
    var files = [];                             // Storage for file-items
    var packagesLength = 0;                     // size of packages in pcap-file

//PushNotification Update-States
    var UPDATE_ALL = 0;
    var UPDATE_STATUS = 1;
    var UPDATE_ERROR = 2;
    var UPDATE_FILESELECTED = 3;

//Serverstates
    var selectedFileID = "";
    var selectedFilePath = "";
    var DEFAULTSTATUS = "Bereit, wenn du's bist ;)";
    var serverStatus = DEFAULTSTATUS;
    var serverError = "";

// configuration ======================================================================
    app.use(morgan('dev'));                                         // log every request to the console
    app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
    app.use(bodyParser.json());                                     // parse application/json
    app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
    app.use(express.static(__dirname + '/static'));

    //Enable CORS to solve the same-origin-policy problem
    app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

        // Disable caching for content files
        res.header("Cache-Control", "no-cache, no-store, must-revalidate");
        res.header("Pragma", "no-cache");
        res.header("Expires", 0);

        // intercept OPTIONS method
        if ('OPTIONS' == req.method) {
          res.status(200).end();
        }
        else {
          next();
        }
    });

//File-Upload
    app.use(multer({
        dest: uploadFolder,      //Output-Folder of Files
        rename: function (fieldname, filename) {
            //\W+/g = findet alle Zeichen, die nicht alphanumerisch und auch keine Unterstriche sind
            return filename.replace(/\W+/g, '-').toLowerCase();
        }
    }));

// Functions ======================================================================

//Push Notifications =====================
    //Log connected users on screen, nothing more -> unnecessary
    io.on('connection', function (socket) {
        console.log('User connected, hooray!');
    });

    //send Notification to all connected Clients
    var sendPushNotification = function(type) {

        //Send specific message to clients
        switch(type){
            case UPDATE_STATUS: {
                    io.sockets.emit('status', {message: serverStatus});
                break;
            }
            case UPDATE_ERROR: {
                    io.sockets.emit('error', {message: serverError});
                break;
            }
            case UPDATE_FILESELECTED: {
                    io.sockets.emit('fileselected', {selectedFilePath: selectedFilePath, selectedFileID: selectedFileID});
                break;
            }
            default: {
                console.log("UPDATE_ALL");
                console.log("Serverstatus: " + serverStatus);
                    io.sockets.emit('status', {message: serverStatus});
                    io.sockets.emit('error', {message: serverError});
                    io.sockets.emit('fileselected', {selectedFilePath: selectedFilePath, selectedFileID: selectedFileID});
                break;
            }
        }
    }

//File Functions =====================
    //checks the complete content of uploadFolder
    //if a file isn't in files[] it is added to files[]
    //checks also, if every file in files[] is still available
    var getFolderContent = function(callback) {
        checkFilesExistence();  //check if every file in files[] is still available
// Walker options
     var walker  = walk.walk(uploadFolder, { followLinks: false });

        walker.on('file', function(root, file, next) {
            var filename = file.name.split('.'); //generate name from path
            filename = filename[filename.length - 2] + "." + filename[filename.length -1];
            //       = name.fileExtension       e.g. record.pcap

            if(file.name.split('.')[file.name.split('.').length - 1] == "pcap") {   //Just take Files, which are pcap-Files
                fs.stat((root + '/' + file.name), function (err, stats) {
                    if (err) {
                        console.log(err);
                        next();
                    }
                    else {
                        FileLookup(root + '/' + file.name, function(result) {   //check if this file is already known
                            if(result === -1) { //if result === -1 the file is not in files[]
                                var fileid = uuid.v4(); //generate an id for the file
                                var filesizeinMB = Number((stats["size"] / 1000000.0).toFixed(2));  //get the filesize from stats['size']

                                files.push({    //add this file to files[]
                                    id: fileid,
                                    name: filename,
                                    path: root + '/' + file.name,
                                    sizeinMB: filesizeinMB
                                });
                                next();
                            }
                            else
                                next();
                        });
                    }
                });
            }
            else
                next();
        });

        walker.on('end', function() {
            callback(files);
        });
    }

    //gets the filepath related to a id from files[]
    var getFilePath = function(fileid, callback) {
        var output = files.filter(function (item) {
            return item.id == fileid
        });
        if(output[0])
            callback(output[0].path);       //output should contain just one item, with the right id
        else
            callback("error");
    }

    //checks, if a File is already in files[] or not
    //if not -1 is returned, otherwise the index
    var FileLookup = function(filepath, callback) {
        var index = -1;
        files.forEach(function(item) {
            if(item['path'] === filepath) {
                index = 1;
            }
        });
        callback(index);
    }

    //removes a file from disk
    var removeFile = function(filePath, callback) {
        fs.unlink(filePath, function(err) {});
    }

    //checks, if every file in files[] is still available on disk
    //if not, it is removed from files[]
    var checkFilesExistence = function() {
        var index = 0;
        files.forEach(function(item) {
            //check if file is still available on server
            fs.exists(item['path'], function(exists) {
                if (!exists) {
                    files = files.splice(index,1);      //remove this specific item from files[]
                }
            });
            index++;
        });
    }

//Sending Packages =====================
    //Read and send pcap-file
    var readAndSend = function(datapath, callback) {
        Reader.read(datapath, function(content) {
            packagesLength = content.length;
            serverStatus = packagesLength + " Packages read";
            sendPushNotification(UPDATE_STATUS);
            var sender = new Sender(content, 'localhost', 6454);

            // Event-Listener
            sender.on('openStarted', function() {
                serverStatus = "File opened";
                sendPushNotification(UPDATE_STATUS);
            })

            sender.on('packageSend', function(packagenumber) {
                serverStatus = "Sending Package: " + packagenumber;
                sendPushNotification(UPDATE_STATUS);
            })

            sender.on('end', function(length) {
                serverStatus = length + " Packages sent";
                sendPushNotification(UPDATE_STATUS);
                callback(length);
            })

            sender.on('error', function(err) {
                serverError = err;
                sendPushNotification(UPDATE_ERROR);
            })
        })
    }

// routes ======================================================================
    // api ---------------------------------------------------------------------
    // get all files
    app.get('/api/files', function(req, res, next) {
        getFolderContent(function(files) {
            res.json(files)
        });
    });

    //initially get selected Filepath and ID
    app.get('/api/getselected', function(req, res, next) {
        res.send({selectedFileID: selectedFileID, selectedFilePath: selectedFilePath, serverStatus: serverStatus});
    });

    // delete a file
    app.delete('/api/files/:file_id', function(req, res, next) {
        getFilePath(req.params.file_id, function(filepath) {
            removeFile(filepath);
            getFolderContent(function(files) {
                res.json(files);
            })
        })
    });

    // upload a file
    app.post('/api/upload', function (req, res) {
        if (req.files.file.originalname.split('.').pop() == 'pcap')  //check, if extension is == 'pcap'
        {                                                       //valid pcap-file
            var name = req.files.file.originalname;
            name = name.split('.')[name.split('.').length - 2]; //cuts the extension '.pcap'
            res.send({pcap: true, name: name, file: req.files.file.originalname, _id:5});
        }
        else
        {                                                       //not a valid pcap-file
            var name = req.files.file.originalname;
            name = name.split('.')[name.split('.').length - 2]; //cuts the extension '.pcap'

            console.log("no pcap-file!");
            res.send({pcap: false, name: name, file: req.files.file.originalname, _id:-1});
        }
    });

    //select a file
    app.get('/api/select/:file_id', function(req, res, next) {
        getFilePath(req.params.file_id, function(filepath) {
            console.log("selected file: " + filepath);
            console.log("fileid: " + req.params.file_id);
            if(filepath != "error") {
                serverStatus = "File " + filepath + " selected";
                selectedFileID = req.params.file_id;
                selectedFilePath = filepath;
                sendPushNotification(UPDATE_ALL);
                res.send({selectedFileID: selectedFileID, selectedFilePath: selectedFilePath});
            }
            else {
                serverStatus = "FileIO-Error! Please refresh site!";
                sendPushNotification(UPDATE_STATUS);
                res.send({selectedFileID: selectedFileID, selectedFilePath: selectedFilePath});
            }
        })
    });

    //deselect a file
    app.delete('/api/select', function(req, res, next) {
        selectedFileID = "";
        selectedFilePath = "";
        serverStatus = DEFAULTSTATUS;
        sendPushNotification(UPDATE_ALL);
        res.send("deselected");
    });

    // play a file
    app.get('/api/play/:file_id', function(req, res, next) {
        getFilePath(req.params.file_id, function(filepath) {
            if(filepath != "error") {
               selectedFileID = req.params.file_id;
               selectedFilePath = filepath;
                console.log("play: " + selectedFilePath);
                console.log("play: " + selectedFileID);

                serverStatus = "Reading file";
               sendPushNotification(UPDATE_STATUS);
               readAndSend(filepath, function (result) {        //Push Notifications will be send inside readAndSend
                       res.send();
                   setTimeout(function() {  //After 20 Seconds, send Update to Client
                       serverStatus = DEFAULTSTATUS;
                       sendPushNotification(UPDATE_STATUS);
                   },20000);
               });
           }
           else {
               serverStatus = "FileIO-Error! Please refresh site!";
               sendPushNotification(UPDATE_STATUS);
            res.send();
           }
       })
    });


// init & start server (start server with "node server.js") ======================================
//Init =====================
    //Read Folder Content
    getFolderContent(function(content) {
        files = content;
    });

    //Start Server
    http.listen(8080);
    console.log("server listening on port 8080");