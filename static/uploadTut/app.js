/**
 * Created by jan on 06.01.15.
 */
angular
    .module('app', ['angularFileUpload'])
    .controller('AppController', function($scope, FileUploader) {
        $scope.uploader = new FileUploader();
        $scope.uploader.url("");
    });