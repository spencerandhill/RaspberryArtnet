var pcapp = require('pcap-parser');
var packages = [];   //This the Container for the packages

module.exports = {
    read: function sender(datapath, callback) {
        packages.length = 0;
        var parser = new pcapp.parse(datapath);

        parser.on('packetData', function (package) {
            packages.push(package); //Fill Container with packages
        });

        parser.on('end', function () {
            callback(packages);
        });
    }
}