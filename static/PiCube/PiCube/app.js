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
                console.log(filepath);
                console.log(fileid);
                selectedFilePath = filepath;
                selectedFileID = fileid;
                $http.get("http://localhost:8080/api/select/" + selectedFileID).then(function(Response){
                    selectedFileID = Response.data.selectedFileID;
                    selectedFilePath = Response.data.selectedFilePath;
                    console.log("respond received");
                    $location.path("/player");  //redirect to player
                })
            },

           removeFile: function(fileid){ //deletes a file from server
            $http.delete("http://localhost:8080/api/files/" + fileid).then(function(Response){
                angular.copy(Response.data, files);  //Update Data
            })
           },

           removeSelectedFilePath: function() {
               $http.delete("http://localhost:8080/api/select").then(function (Response) {

                   selectedFilePath = "";
                   selectedFileID = "";
               })
           },

            getSelectedFile: function(callback) {
                $http.get("http://localhost:8080/api/getselected").then(function(Response) {
                    selectedFileID = Response.data.selectedFileID;
                    selectedFilePath = Response.data.selectedFilePath;
                    callback(Response.data);
                })
            },

           getServerStatus: function(callback) {
             $http.get("http://localhost:8080/api/status").then(function(Response) {
                 callback(Response.data);
             })
           },

           playFile: function() {
               console.log("play: " + selectedFileID);
               $http.get("http://localhost:8080/api/play/" + selectedFileID).then(function(Response){}) //ack will come through notification
           }
        };
    })

    .controller('FilePlayCtrl', function($scope, fileFactory) {
        $scope.msg = {};
        fileFactory.getSelectedFile(function (Response) {
            if(Response.selectedFileID) {
                $scope.selectedFilePath = Response.selectedFilePath;
                $scope.selectedFileID = Response.selectedFileID;
            }
        });   //get selected Filepath and ID from serve

        fileFactory.getServerStatus(function(response) {
            $scope.msg.status = response.status;
            $scope.msg.error = response.error;
        })

        $scope.removeSelectedFilePath = function() {    //this should be called from angular
            fileFactory.removeSelectedFilePath();
        }

        $scope.playFile = function() {
            fileFactory.playFile();
        }

        //is called, when Push-Notification is received
        var receivePushNotification = function(msg) {
            console.log("update coming");
            if(msg) {
                $scope.$apply(function () {
                    if(JSON.parse(msg.data).update) {       //check if update is necessary
                        $scope.files = fileFactory.getFiles();
                        var Response = fileFactory.getSelectedFile();   //get selected Filepath and ID from serve
                        $scope.selectedFilePath = Response.selectedFilePath;
                        $scope.selectedFileID = Response.selectedFileID;
                    }
                    $scope.msg.status = JSON.parse(msg.data).status;    //Update the status of Server anyway
                    $scope.msg.error = JSON.parse(msg.data).error;      //Update error status of Server anyway
                })
            }
        }

        var source = new EventSource('/api/stats');
            source.addEventListener('message', receivePushNotification, false);      //This registers the EventHandler for Push-Notifications
    })

    //used in start.html
    .controller('FileCtrl', function($scope, fileFactory) {
        $scope.msg = {};
        $scope.files = fileFactory.getFiles();
        $scope.fileFactory = fileFactory;
        //is called, when Push-Notification is received
        var receivePushNotification = function(msg) {
            if(msg) {
                $scope.$apply(function () {
                    if(JSON.parse(msg.data).update) {       //check if update is necessary
                        $scope.files = fileFactory.getFiles();
                        var Response = fileFactory.getSelectedFile();   //get selected Filepath and ID from serve
                        $scope.selectedFilePath = Response.selectedFilePath;
                        $scope.selectedFileID = Response.selectedFileID;
                    }
                    $scope.msg.status = JSON.parse(msg.data).status;    //Update the status of Server anyway
                    $scope.msg.error = JSON.parse(msg.data).error;      //Update error status of Server anyway
                })
            }
        }

        var source = new EventSource('/api/stats');
        source.addEventListener('message', receivePushNotification, false);      //This registers the EventHandler for Push-Notifications

    })

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
    }]);