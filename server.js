// set up ========================
    var express  = require('express');
    var server = express();                     // create our server w/ express
    var multer = require('multer');             // used for File-Upload
    var morgan = require('morgan');             // log requests to the console (express4)
    var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
    var walk    = require('walk');              // Used to walk recursive through folders
    var fs = require('fs');                     // Used for filesystem-access
    var uuid = require('node-uuid');            // used to generate uuid's to identify files

    var uploadFolder = 'static/uploads';        //Define Upload-Folder for all Actions with Files
    var files   = [];                           //Stores file-items

    // configuration =================

    server.use(morgan('dev'));                                         // log every request to the console
    server.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
    server.use(bodyParser.json());                                     // parse application/json
    server.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
    server.use(express.static(__dirname + '/static'));

    //Enable CORS to solve the same-origin-policy problem
    server.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
 
        // intercept OPTIONS method
        if ('OPTIONS' == req.method) {
          res.status(200).end();
        }
        else {
          next();
        }
    });

//File-Upload
    server.use(multer({
        dest: uploadFolder,      //Output-Folder of Files
        rename: function (fieldname, filename) {
            //\W+/g = findet alle Zeichen, die nicht alphanumerisch und auch keine Unterstriche sind
            return filename.replace(/\W+/g, '-').toLowerCase();
        }
    }));

//Functions

    //checks, if every file in files[] is still available on the server
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

    //checks, if a File is already in files[] or not
    //if not false is returned, otherwise true
    var FileLookup = function(filepath, callback) {
        var index = -1;
        files.forEach(function(item) {
            if(item['path'] === filepath) {
                index = 1;
            }
        });
        callback(index);
    }

    //gets the filepath related to a id from files[]
    var getFilePath = function(fileid, callback) {
        var output = files.filter(function(item){
            return item.id==fileid});

        callback(output[0].path);       //output should contain just one item, with the right id
    }

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

    var removeFile = function(filePath, callback) {
        fs.unlink(filePath, function(err) {});
    }

// routes ======================================================================

    // api ---------------------------------------------------------------------
    // get all files
    server.get('/api/files', function(req, res, next) {
        getFolderContent(function(files) {
            res.json(files)
        });
    });

    // delete a file
    server.delete('/api/files/:file_id', function(req, res, next) {

        getFilePath(req.params.file_id, function(filepath) {
            removeFile(filepath);
            getFolderContent(function(files) {
                res.json(files);
            })
        })
    });

    // upload a file
    server.post('/api/upload', function (req, res) {
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

    // listen (start server with node server.js) ======================================
    server.listen(8080);
    console.log("server listening on port 8080");