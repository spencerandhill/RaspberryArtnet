var util = require('util');
var EventEmitter = require('events').EventEmitter;
var dgram = require('dgram');               // used to send packages through network
var socket;                                 // used to send npackages through network

var packages = [];   //This the Container for the packages
var contentLength = 0;
var PORT = 6454;
var HOST = 'localhost';

var sender = function sender (content, host, port) {
    packages = content;
    // we need to store the reference of `this` to `self`, so that we can use the current context in the setTimeout (or any callback) functions
    // using `this` in the setTimeout functions will refer to those funtions, not the Radio class
    var self = this;

//sends pcap-packages through recursive call of itself
//See the comment under "if(packages.length) for more info, why this is recursive
var sendPackage = function(package, callback) {
    if(package)
    {
        socket.send(package, 0, package.length, PORT, HOST, function(err, bytes) {
            if (err)
            {
                callback(err);
                throw err;
            }
            else
            {
                self.emit('packageSend', contentLength - packages.length);
            }
            //check if more packages available
            if(packages.length > 0)
            {
                //send the next package
                //you MUST do this in the callback of socket.send, otherwise the buffer of the socket will be overwritten.
                //See: http://nodejs.org/docs/v0.3.1/api/dgram.html#dgram.send
                sendPackage(packages.shift(),function(result){ //Send next package recursive
                    callback(result)    //pass result to callback
                });
            }
            else
            {
                callback("ok"); //if not, everything was send =) be happy!
                socket.close();
            }
        });
    }
    else
        callback("File Corrupt! Please use another one, or try again");
}

//init Network-Stuff
    if(port && host) {
        PORT = port;
        HOST = host;
    }

    // emit 'open' event instantly
    setTimeout(function() {
/*
        self.emit('openStarted');                       //When file-reading begins
        self.emit('package');                           //During file-reading
        self.emit('openFinished');                      //When file-reading is finished
        self.emit('sendingStarted');                    //When sending begins
        self.emit('packet');                            //During packet sending
        self.emit('sendingFinished');                   //When packet-sending is finished
        self.emit('error', "this is a test error-message");  //When error occurs
*/

//Sending packages
        contentLength = packages.length;
        socket = dgram.createSocket('udp4');
        sendPackage(packages.shift(), function(result) {
            if(result != "ok")
                self.emit('error', result);
            else
                self.emit('end', contentLength);
        })
    }, 0);
};

// extend the EventEmitter class using our Radio class
util.inherits(sender, EventEmitter);

// we specify that this module is a refrence to the Radio class
module.exports = sender;