/**
 * Created by jan on 29.12.14.
 */

angular.module('picube', ['angularFileUpload', 'ngRoute'])
    .config(['$routeProvider', function($routeProvider){
        $routeProvider
            .when('/upload',
            {
                templateUrl: "partials/upload.html",
                controller: "FileUploadCtrl"
            })
            .when('/player',
            {
                templateUrl: "partials/player.html",
                controller: "FilePlayCtrl"
            })
            .when('/recorder',
            {
                templateUrl: "partials/recorder.html",
                controller: "FileRecordCtrl"
            })
            .when('/',
            {
                templateUrl: "partials/start.html",
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
                $http.get('/api/files/').then(function (Response) {   //takes all files from the api
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
                $http.get("/api/select/" + selectedFileID).then(function(Response){
                    selectedFileID = Response.data.selectedFileID;
                    selectedFilePath = Response.data.selectedFilePath;
                    console.log("File: " + selectedFileID + " selected");
                    $location.path("/player");  //redirect to player
                })
            },

            removeFile: function(fileid){ //deletes a file from server
               console.log("Remove");
                $http.delete("/api/files/" + fileid).then(function(Response){
                    angular.copy(Response.data, files);  //Update Data
                })
            },

            removeSelectedFilePath: function() {    //deselects a file from server
                $http.delete("/api/select").then(function (Response) {
                    if(Response.data == "deselected")
                    {
                        selectedFileID = "";
                        selectedFilePath = "";
                    }
                })
            },

            getSelectedFile: function(callback) {
                $http.get("/api/getselected").then(function(Response) {
                    selectedFileID = Response.data.selectedFileID;
                    selectedFilePath = Response.data.selectedFilePath;
                    callback(Response.data);
                })
            },

            playFile: function() {
                console.log("play: " + selectedFileID);
                $http.get("/api/play/" + selectedFileID).then(function(Response){}) //ack will come through notification
            },

            startRecordFile: function(FileRecordName, callback) {
                console.log("record start: " + FileRecordName);
                $http.get("/api/startrecord/" + FileRecordName).then(function(Response) {
                    console.log("response: " + Response);

                    callback(true);
                })
            },

            stopRecordFile: function(FileRecordName, callback) {
                console.log("record stop: " + FileRecordName);
                $http.get("/api/stoprecord/" + FileRecordName).then(function(Response) {
                    console.log("response: " + Response);
                    callback(true);
                })
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
    .controller('FileRecordCtrl', function($scope, fileFactory, socket, $timeout) {

        $scope.RecorderMsg = {};
        $scope.recordingState;

        $scope.startRecord = function() {
            console.log($scope.selectedRecordFilePath);
            $scope.recordingState = "recording";
            $scope.recordStop = "";

            fileFactory.startRecordFile(encodeURIComponent($scope.selectedRecordFilePath), function(result) {
                if(result==true)
                    $scope.recordingState = "recording";
                else
                    $scope.recordingState = "";
            });
        }

        $scope.stopRecord = function() {
            console.log("record stop");
            $scope.recordingState = "";

            fileFactory.stopRecordFile(encodeURIComponent($scope.selectedRecordFilePath), function(result) {
                if(result == true)
                {
                    $scope.recordingState="";
                    $scope.recordStop = "recordStop";

                    //Hide info-bar after 10 Seconds
                    $timeout(function(){
                        $scope.recordStop = "";
                    },10000);
                }
            })
        }


//PushNotfications
        socket.on('status', function (data) {
            console.log("status: " + data.message);
            $scope.PlayerMsg.status = data.message;
        });

        socket.on('error', function (data) {
           $scope.PlayerMsg.error = data.message;
        });

        socket.on('fileselected', function (data) {
            fileFactory.selectedFilePath = data.selectedFilePath;
            fileFactory.selectedFileID = data.selectedFileID;

            console.log("selectedFilePath: " + $scope.selectFilePath);
            console.log("selectedFileID: " + $scope.selectFileID);
            $scope.selectedFilePath = data.selectedFilePath;
            $scope.selectedFileID = data.selectedFileID;
        })
    })

    //controller of player.html-partial
    .controller('FilePlayCtrl', function($scope, fileFactory, socket) {
        $scope.PlayerMsg = {};

//Init Serverstate and get Serverstate to webapp
        fileFactory.getSelectedFile(function (Response) {
            if(Response.selectedFileID) {
                $scope.selectedFilePath = Response.selectedFilePath;
                $scope.selectedFileID = Response.selectedFileID;
            }
            $scope.PlayerMsg.status = Response.serverStatus;
        });   //get selected Filepath, ID and Status from server

//Actions
        $scope.removeSelectedFilePath = function() {    //this should be called from angular
            $scope.selectedFilePath = "";
            $scope.selectedFileID = "";

            fileFactory.removeSelectedFilePath(function(result) {
                if(result != true) {
                    $scope.PlayerMsg.status = "Error deselecting file!";
                }
            });
        }

        $scope.playFile = function() {
            fileFactory.playFile();
        }


//PushNotfications
        socket.on('status', function (data) {
            console.log("status: " + data.message);
            $scope.PlayerMsg.status = data.message;
        });

        socket.on('error', function (data) {
            $scope.PlayerMsg.error = data.message;
        });

        socket.on('fileselected', function (data) {
            fileFactory.selectedFilePath = data.selectedFilePath;
            fileFactory.selectedFileID = data.selectedFileID;

            console.log("selectedFilePath: " + $scope.selectFilePath);
            console.log("selectedFileID: " + $scope.selectFileID);
            $scope.selectedFilePath = data.selectedFilePath;
            $scope.selectedFileID = data.selectedFileID;
        })
    })

    //controller of start.html-partial
    .controller('FileCtrl', function($scope, fileFactory) {
        $scope.files = fileFactory.getFiles();
        $scope.fileFactory = fileFactory;
    })