/**
 * Created by jan on 29.12.14.
 */
angular.module('picube', [])
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
   });
