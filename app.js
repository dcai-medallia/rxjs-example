angular
  .module('app', ['rx'])
  .controller('AppController', AppController)
;


function AppController($scope, $log, $http, observeOnScope) {
  $log.log('AppController');

  observeOnScope($scope, 'keyword')
    .throttle(1000)
    .map(function(change){
      return change.newValue || "";
    })
    .distinctUntilChanged() // Only if the value has changed
    .flatMapLatest(searchWikipedia)
    .safeApply($scope, function(result) {
      $log.log('render');
      $scope.results = [];

      for(var i = 0, ii = result.data[1].length; i < ii; i++){
        $scope.results.push({
          title: result.data[1][i],
          url: result.data[3][i]
        });
      }
    })
    .subscribe();

  function searchWikipedia(term) {
    return Rx.Observable.fromPromise($http({
        url: "http://en.wikipedia.org/w/api.php?&callback=JSON_CALLBACK",
        method: "jsonp",
        params: {
          action: "opensearch",
          search: encodeURI(term),
          format: "json"
        }
      })
    );
  }
}
