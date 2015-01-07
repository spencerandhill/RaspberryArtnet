/**
 * Created by jan on 06.01.15.
 */
angular.module('app', ['ngRoute'])
    .config(['$routeProvider', function($routeProvider){
        $routeProvider.when("/",
            {
                templateUrl: "app.html",
                controller: "AppController"
            }
        );
    }])

    .controller('AppController', function($scope) {
        $scope.model = {message: "hello world!"};
    });