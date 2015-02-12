/**
 * Created by jan on 29.12.14.
 */

angular.module('picube', ['angularFileUpload', 'ngRoute'])
    .config(['$routeProvider', function($routeProvider){
        $routeProvider
            .when('/upload',
            {
                templateUrl: "../partials/upload.html",
                controller: "FileUploadCtrl"
            })
            .when('/player',
            {
                templateUrl: "../partials/player.html",
                controller: "FilePlayCtrl"
            })
            .when('/',
            {
                templateUrl: "../partials/start.html",
                controller: "FileCtrl"
            })
            .otherwise({
                redirectTo: '/'
            });
    }])

    .factory('fileFactory', function($http, $location) {
        var files = [];
        var selectedFilePath = "";
        var selectedFileID = "";
        return {

            getFiles: function() {
                $http.get('http://localhost:8080/api/files/').then(function (Response) {   //takes all files from the api
                    angular.copy(Response.data, files);  //Update Data
                });
                return files;
            },

            //just for updating files, when push notification comes in with data
            updateFiles: function(serverMessage){
                //selectedFilePath = serverMessage.filepath;
                //selectedFileID = serverMessage.fileid;
                angular.copy(serverMessage.files, files);
            },

            selectFile: function(filepath, fileid){
                selectedFilePath = filepath;
                selectedFileID = fileid;
                $http.get("http://localhost:8080/api/select/" + selectedFileID).then(function(Response){
                    selectedFileID = Response.data.selectedFileID;
                    selectedFilePath = Response.data.selectedFilePath;
                    console.log("respond received, file selected");
                    $location.path("/player");  //redirect to player
                })
            },

            removeFile: function(fileid){ //deletes a file from server
                $http.delete("http://localhost:8080/api/files/" + fileid).then(function(Response){
                    angular.copy(Response.data, files);  //Update Data
                })
            },

            removeSelectedFilePath: function() {    //deselects a file from server
                $http.delete("http://localhost:8080/api/select").then(function (Response) {
                })
            },

            getSelectedFile: function(callback) {
                $http.get("http://localhost:8080/api/getselected").then(function(Response) {
                    selectedFileID = Response.data.selectedFileID;
                    selectedFilePath = Response.data.selectedFilePath;
                    callback(Response.data);
                })
            },

            playFile: function() {
                console.log("play: " + selectedFileID);
                $http.get("http://localhost:8080/api/play/" + selectedFileID).then(function(Response){}) //ack will come through notification
            }
        };
    })

    //This is the injection of socket.io into the controller
    //it's just a wrapper to use socket.io from controller
    .factory('socket', function($rootScope) {
        var socket = io();
        return {
            on: function (eventName, callback) {
                socket.on(eventName, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        callback.apply(socket, args);
                    });
                });
            },

            emit: function (eventName, data, callback) {
                socket.emit(eventName, data, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        if (callback) {
                            callback.apply(socket, args);
                        }
                    });
                });
            }
        };
    })

    //controller of upload.html-partial
    .controller('FileUploadCtrl', ['$scope', 'FileUploader', function($scope, FileUploader) {
        var uploader = $scope.uploader = new FileUploader({
            url: '/api/upload',
            filters: [{                  //Filtert ausgewählte Dateien und prüft ob diese .pcap files sind
                name: 'FileFilter',
                fn: function (item) {
                    var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
                    var x = '|vnd.tcpdump.pcap|'.indexOf(type) !== -1;
                    if (!x) $scope.errorMsg = "Incorrect file format! This will not be uploaded. Please try again.";
                    console.log("x: " + x);
                    return x;
                }
            }]
        })

        // CALLBACKS
        uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/, filter, options) {
            console.info('onWhenAddingFileFailed', item, filter, options);
        };
        uploader.onAfterAddingFile = function(fileItem) {
            console.info('onAfterAddingFile', fileItem);
        };
        uploader.onAfterAddingAll = function(addedFileItems) {
            console.info('onAfterAddingAll', addedFileItems);
        };
        uploader.onBeforeUploadItem = function(item) {
            console.info('onBeforeUploadItem', item);
        };
        uploader.onProgressItem = function(fileItem, progress) {
            console.info('onProgressItem', fileItem, progress);
        };
        uploader.onProgressAll = function(progress) {
            console.info('onProgressAll', progress);
        };
        uploader.onSuccessItem = function(fileItem, response, status, headers) {
            console.info('onSuccessItem', fileItem, response, status, headers);
        };
        uploader.onErrorItem = function(fileItem, response, status, headers) {
            console.info('onErrorItem', fileItem, response, status, headers);
        };
        uploader.onCancelItem = function(fileItem, response, status, headers) {
            console.info('onCancelItem', fileItem, response, status, headers);
        };
        uploader.onCompleteItem = function(fileItem, response, status, headers) {
            console.info('onCompleteItem', fileItem, response, status, headers);
        };
        uploader.onCompleteAll = function() {
            console.info('onCompleteAll');
        };

        console.info('uploader', uploader);
    }])

    //controller of player.html-partial
    .controller('FilePlayCtrl', function($scope, fileFactory, socket) {
        $scope.msg = {};

//Init Serverstate and get Serverstate to webapp
        fileFactory.getSelectedFile(function (Response) {
            if(Response.selectedFileID) {
                $scope.selectedFilePath = Response.selectedFilePath;
                $scope.selectedFileID = Response.selectedFileID;
            }
            $scope.msg.status = Response.serverStatus;
        });   //get selected Filepath, ID and Status from server

//Actions
        $scope.removeSelectedFilePath = function() {    //this should be called from angular
            $scope.selectedFilePath = "";
            $scope.selectedFileID = "";

            fileFactory.removeSelectedFilePath(function(result) {
                if(result != true) {
                    $scope.msg.status = "Error deselecting file!";
                }
            });
        }

        $scope.playFile = function() {
            fileFactory.playFile();
        }


//PushNotfications
        socket.on('status', function (data) {
            console.log("status: " + data.message);
            $scope.msg.status = data.message;
        });

        socket.on('error', function (data) {
           $scope.msg.error = data.message;
        });

        socket.on('fileselected', function (data) {
            fileFactory.selectedFilePath = data.selectedFilePath;
            fileFactory.selectedFileID = data.selectedFileID;
            console.log("fileFactory: " + fileFactory.selectedFilePath);
            console.log("fileFactory: " + fileFactory.selectedFileID);

            $scope.selectedFilePath = data.selectedFilePath;
            $scope.selectedFileID = data.selectedFileID;
        })
    })

    //controller of start.html-partial
    .controller('FileCtrl', function($scope, fileFactory) {
        $scope.msg = {};
        $scope.files = fileFactory.getFiles();
        $scope.fileFactory = fileFactory;
    })