var PORT = 6454;
var HOST = '192.168.1.61';

var dgram = require('dgram');
var pcapp = require('pcap-parser');

var socket = dgram.createSocket('udp4');
var parser = new pcapp.parse('record.pcap');
var packages = [];   //This the Container for the packages


parser.on('packetData', function(package){
    packages.push(package); //Fill Container with packages
});

parser.on('end', function(){
    if(packages.length > 0)
        send(packages.shift()); //Get first element and send it out
});

function send (package){
    socket.send(package, 0, package.length, PORT, HOST, function(err, bytes) {
        if (err) throw err;
        console.log('UDP message sent to ' + HOST +':'+ PORT);
        if(packages.length > 0)
            send(packages.shift());   //Send next package
        else
        {
            socket.close();
            console.log("socket closed!");
        }
    });  
}