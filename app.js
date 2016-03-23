angular
  .module('app', ['rx'])
  .controller('AppController', AppController)
;


function AppController($scope, $log, observeOnScope) {
  $log.log('AppController');

  $scope.keyword = 'something';
}
