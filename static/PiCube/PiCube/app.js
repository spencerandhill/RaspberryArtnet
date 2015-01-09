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

            playFile: function(filepath, fileid){
                selectedFilePath = filepath;
                selectedFileID = fileid;
                $location.path("/player");  //redirect to player
            },

           removeFile: function(fileid){ //deletes a file from server
            $http.delete("http://localhost:8080/api/files/" + fileid).then(function(Response){
                angular.copy(Response.data, files);  //Update Data
            })},

           removeSelectedFilePath: function() {
               selectedFilePath = "";
               selectedFileID = "";
               return selectedFilePath;
           },

            getSelectedFilePath: function() {
              return selectedFilePath;
            },

           playSelectedFilePath: function() {
               $http.get("http://localhost:8080/api/play/" + selectedFileID).then(function(Response){}) //ack will come through notification
           }
        };
    })

    .controller('FilePlayCtrl', function($scope, fileFactory) {
        $scope.selectedFilePath = fileFactory.getSelectedFilePath();
        $scope.msg = {};

        $scope.removeSelectedFilePath = function() {    //this should be called from angular
            $scope.selectedFilePath = fileFactory.removeSelectedFilePath(); //removes the selectedFilePath and updates it
        }

        $scope.playSelectedFilePath = function() {
            fileFactory.playSelectedFilePath();
        }
                //is called, when Push-Notification is received
                var handleCallback = function(msg) {
                    $scope.$apply(function() {
                        $scope.msg = JSON.parse(msg.data);
                    })
                }

                var source = new EventSource('/api/stats');
                source.addEventListener('message', handleCallback, false);      //This registers the EventHandler for Push-Notifications
    })

    .controller('FileCtrl', function($scope, fileFactory) {
        $scope.files = fileFactory.getFiles();
        $scope.fileFactory = fileFactory;
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