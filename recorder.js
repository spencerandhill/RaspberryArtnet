var spawn = require('child_process').spawn;
var recorder_t;

//Used for emitting Events
var util = require('util');
var EventEmitter = require('events').EventEmitter;

//Preparings for child-process
var command_t = 'tshark';
var port_t = 6454;
var filter_t = 'udp port ' + port_t;
var iface_t = 'eth0';
var packagelimit_t = 0;
var filename_t = 'capture.pcap';
var relativeFilePath_t = 'static/uploads/';

//########################################################Debugging =)############################################
filter_t = 'udp';
//########################################################Debugging =)############################################

var recorder = function recorder(iface, filename, packagelimit) {
//Do some initial Stuff

// we need to store the reference of `this` to `self`, so that we can use the current context in the setTimeout (or any callback) functions
    // using `this` in the setTimeout functions will refer to those functions, not the recorder class
    var self = this;

//if filename is not specified throw error and return NULL;
    if (typeof filename === 'undefined') {
        console.log('Empty Filepath');
        self.emit('err_filepath', 'Please specify a Filepath');
        return;
    }
    else
        filename_t = filename;

    if (typeof iface === 'undefined') //if an alternative interface is set, choose this one, otherwise the default one
        iface_t = 'eth0';
    else
        iface_t = iface;

    if (typeof packagelimit === 'undefined')
        packagelimit_t = 0;
    else
        packagelimit_t = packagelimit;


//Start Capturing Process with Async child process
    //Setup 'Recorder' as ChildProcess and pass Arguments (this will start the process)
    if (packagelimit_t > 0)    //create recorder with packagelimit
        recorder_t = spawn(command_t, ['-f', filter_t, '-i', iface_t, '-c', packagelimit_t, '-w', relativeFilePath_t + filename_t]);
    else                    //create recorder without packagelimit
        recorder_t = spawn(command_t, ['-f', filter_t, '-i', iface_t, '-w', relativeFilePath_t + filename_t]);

    self.emit('start');

    //Listening for errors
    recorder_t.stderr.on('data', function (data) {
        console.log('Error: ' + data);
        self.emit('err', data);
    });

    //Listening for end of Process
    recorder_t.on('close', function (code) {
        if (code == 0) {
            console.log("Process exited successfully");
            self.emit('finished');
        }
        else {
            console.log("Process exited with code: " + code);
            self.emit('err_finished', code);
        }
    });
}

var stopRecord = function () {
    if(recorder_t)
        recorder_t.kill('SIGQUIT');
}

// extend the EventEmitter class using our Recorder class
util.inherits(recorder, EventEmitter);

// we specify that this module is a reference to the Recorder Class
module.exports = recorder;
module.exports = stopRecord;