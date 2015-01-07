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
            .when('/',
            {
                templateUrl: "../partials/start.html",
                controller: "FileCtrl"
            })
            .otherwise({
                redirectTo: '/'
            });
    }])

    .factory('fileFactory', function($http) {
        var files = [];
        return {
            getFiles: function() {
                $http.get('http://localhost:8080/api/files/').then(function (Response) {   //takes all files from the api, tested with postman
                    angular.copy(Response.data, files);  //Update Data
                });
                return files;
            },

            postFile: function(filepath){
                $http.post("http://localhost:8080/api/files/", filepath).then(function (Response) {   //adds a new file to the server-api, tested with postman
                    angular.copy(Response.data, files);  //Update Data
                });
            },

            playFile: function(filepath){   //this is not important at the moment
                console.log("Play called");
                console.log(filepath);
            },

            removeFile: function(_id){ //deletes a file from server, tested with postman
                $http.delete("http://localhost:8080/api/files/" + _id).then(function(Response){
                    angular.copy(Response.data, files);  //Update Data
                });
            }
        };
    })

    .controller('FileCtrl', function($scope, fileFactory) {
        $scope.files = fileFactory.getFiles();
        $scope.fileFactory = fileFactory;
    })

    .controller('FileUploadCtrl', ['$scope', 'FileUploader', function($scope, FileUploader) {
        var uploader = $scope.uploader = new FileUploader({
            url: '/api/upload',
            filters:[{                  //Filtert ausgewählte Dateien und prüft ob diese .pcap files sind
                name: 'FileFilter',
                fn: function(item){
                    var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
                    var x = '|vnd.tcpdump.pcap|'.indexOf(type) !== -1;
                    if (!x) $scope.errorMsg = "Incorrect file format! This will not be uploaded. Please try again.";
                    console.log("x: " + x);
                    return x;
                }
            }]
        });

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