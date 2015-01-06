var PORT = 6454;
var HOST = '192.168.2.137';

var dgram = require('dgram');
var pcapp = require('pcap-parser');
var util = require('util');

var datapath = 'record.pcap';
var socket = dgram.createSocket('udp4');
var packages = [];   //This the Container for the packages
var containerLength=0;

read(datapath, function(length){
    console.log("DataRead successfull\tPackageCount: " + length);
    send(function(result){
        if(result=="ok")
            console.log("Data successfull sent!");
        else
            console.log("Error occurs: " + result);
    });
});

function sendPackage (package, callback){
    if(package)
    {
        console.log("[" + (containerLength - packages.length) + "][" + containerLength + "]" + " sent to " + HOST + ":" + PORT);
        socket.send(package, 0, package.length, PORT, HOST, function(err, bytes) {
            if (err) 
            {
                callback(err);
                throw err;
            }

            if(packages.length > 0)
            {
                sendPackage(packages.shift(),function(result){ //Send next package recursive
                    callback(result)    //pass result to callback
                });
            }
            else
            {
                callback("ok");
                socket.close();
                console.log("Socket closed");
            }
        });
    }
    else
        callback("There's no Data\nPlease read in Data first");
}

function send(callback){
    sendPackage(packages.shift(), function(result){
        callback(result);
    });
}

function read(datapath, callback){
    var parser = new pcapp.parse(datapath);
 
    parser.on('packetData', function(package){
        packages.push(package); //Fill Container with packages
    });
    
    parser.on('end', function(){
        containerLength = packages.length;
        callback(containerLength);
    });
}