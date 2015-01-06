// set up ========================
    var express  = require('express');
    var server = express();                     // create our server w/ express
    var multer = require('multer');
    var mongoose = require('mongoose');                     // mongoose for mongodb-connection
    var morgan = require('morgan');             // log requests to the console (express4)
    var bodyParser = require('body-parser');    // pull information from HTML POST (express4)

    // configuration =================

    mongoose.connect('mongodb://localhost:27017/');     // connect to local running mongoDB database on localhost:27017

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

// define model =================
    var Files = mongoose.model('Files', {
        name : String,
        path : String
    });

//File-Upload
    server.use(multer({
        dest: './static/uploads/',      //Output-Folder of Files
        rename: function (fieldname, filename) {
            return filename.replace(/\W+/g, '-').toLowerCase();
        }
    }));

// routes ======================================================================

    // api ---------------------------------------------------------------------
    // get all files
    server.get('/api/files', function(req, res, next) {

        // use mongoose to get all files in the database
        Files.find(function(err, files) {

            // if there is an error retrieving, send the error. nothing after res.send(err) will execute
            if (err)
                res.send(err)

            res.json(files); // return all files in JSON format
        });
    });

    // create file and send back all files after creation
    server.post('/api/files', function(req, res, next) {
        // create a file, information comes from AJAX request from Angular
        var filepath = req.body.path;
        var filename = "testname";    //generate name from path
        
        Files.create({
            name : filename,
            path : filepath
        }, function(err, files) {
            if (err)
                res.send(err);

            // get and return all the files after you create another
            Files.find(function(err, files) {
                if (err)
                    res.send(err)
                res.json(files);
            });
        });

    });

    // delete a file
    server.delete('/api/files/:file_id', function(req, res, next) {
       Files.remove({
            _id : req.params.file_id
        }, function(err, files) {
            console.log(err);
            if (err)
                res.send(err);

            // get and return all the files after you create another
            Files.find(function(err, files) {
                if (err)
                    res.send(err)
                res.json(files);
            });
        });
    });

    // upload a file
    server.post('/api/upload', function (req, res) {
        if (req.files.userFile.name.split('.').pop() == 'artdmx')  //check, if extension is == 'artdmx'
        {                                                       //valid artdmx-file
            var name = req.files.userFile.name;
            name = name.split('.')[name.split('.').length - 2]; //cuts the extension '.artdmx'

            res.send({artdmx: true, name: name, file: req.files.userFile.name, _id:5});
        }
        else
        {                                                       //not a valid artdmx-file
            var name = req.files.userFile.name;
            name = name.split('.')[name.split('.').length - 2]; //cuts the extension '.artdmx'

            console.log("no artdmx-file!");
            res.send({artdmx: false, name: name, file: req.files.userFile.name, _id:-1});
        }
    });

    // listen (start server with node server.js) ======================================
    server.listen(8080);
    console.log("server listening on port 8080");
