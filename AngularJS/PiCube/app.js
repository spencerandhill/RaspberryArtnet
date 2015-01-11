/**
 * Created by jan on 29.12.14.
 */
angular.module('picube', [])     //Name des Moduls
    .factory('fileFactory', function($http) {          //Name der Factory
        var files = [];

        return {
            getFiles: function(callback) {
                $http.get('files.json').then(function (Response) {   //zieht alle aktuellen Files per REST vom Server (im Moment noch aus files.json)
                    files = Response.data;
                    callback(files);
                });
            },

            postFile: function(filepath){    //fügt ein File zum Server hinzu
                $http.post("localhost/addFile", filepath).then(function (Response) {   //schiebt ein neues File zum Server
                    files = Response.data;
                });
                return files;
                console.log("Post ausgelöst");
            },

            selectFile: function(filepath){

                console.log("Play ausgelöst");
                console.log(filepath);
            },

            removeFile: function(filepath){ //löscht ein File vom Server
                $http.delete("http://localhost/addFile", filepath).then(function(callback){
                    console.log(callback);
                });

                console.log("Remove ausgelöst");
                console.log(filepath);
            }
        };
    })
    .controller('FileCtrl', function($scope, fileFactory) {
        $scope.fileFactory = fileFactory;

        init();

        function init() {
            fileFactory.getFiles(function(files){
                $scope.files = files;
            });
        }
    });