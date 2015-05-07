var util = require('util');
var EventEmitter = require('events').EventEmitter;
var dgram = require('dgram');               // used to send packages through network
var socket;                                 // used to send packages through network

var packages = [];   //This the Container for the packages
var contentLength = 0;
var PORT = 6454;
var HOST = 'localhost';

var sender = function sender (content, host, port) {
    packages = content;

    //init Network-Stuff
    if(port && host) {
        PORT = port;
        HOST = host;
    }

    // we need to store the reference of `this` to `self`, so that we can use the current context in the setTimeout (or any callback) functions
    // using `this` in the setTimeout functions will refer to those functions, not the sender class
    var self = this;

//sends pcap-packages through recursive call of itself
//See the comment under "if(packages.length) for more info, why this is recursive
var sendPackage = function(package_data, callback) {
    if(package_data)
    {
        socket.send(package_data, 0, package_data.length, PORT, HOST, function(err, bytes) {
            if (err)
            {
                console.log(err);
                self.emit('error', err);
            }
            else
            {
                self.emit('packageSend', contentLength - packages.length);
            }

            //check if more packages are available
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
                callback("ok"); //everything sent =) be happy!
                socket.close();
            }
        });
    }
    else
        callback("File Corrupt! Please use another one, or try again");
}


/*
        self.emit('openStarted');                           //When file-reading begins
        self.emit('package');                               //During file-reading
        self.emit('openFinished');                          //When file-reading is finished
        self.emit('sendingStarted');                        //When sending begins
        self.emit('packet');                                //During packet sending
        self.emit('sendingFinished');                       //When packet-sending is finished
        self.emit('error', "this is a test error-message"); //When error occurs
*/

//Sending packages
        contentLength = packages.length;
        socket = dgram.createSocket('udp4');
        sendPackage(packages.shift(), function(result) {
            if(result != "ok")
                self.emit('error', result);
            else
                self.emit('sendingFinished', contentLength);
        });
};

// extend the EventEmitter class using our sender class
util.inherits(sender, EventEmitter);

// we specify that this module is a reference to the sender class
module.exports = sender;