angular
  .module('app', ['rx'])
  .controller('AppController', AppController)
;


function AppController($scope, $log, $http, rx, observeOnScope) {

  $scope.keyword = '';
  $scope.results = [];


  observeOnScope($scope, 'keyword')
    .throttle(1000)
    .map(function(change){
      $log.log(change);
      return change.newValue || "";
    })
    .distinctUntilChanged() // Only if the value has changed
    .flatMapLatest(searchWikipedia)
    .safeApply($scope, function(results) {
      $log.log(results);
      $scope.results = results;
    })
    .subscribe();


  $scope.$createObservableFunction('search')
    .map(function() { return $scope.keyword; })
    .flatMapLatest(searchWikipedia)
    .subscribe(function(results) {
      $log.log(results);
      $scope.results = results;
    });


  function searchWikipedia(keyword) {
    return rx.Observable.fromPromise(
      $http({
        url: "http://en.wikipedia.org/w/api.php?&callback=JSON_CALLBACK",
        method: "jsonp",
        params: {
          action: "opensearch",
          search: encodeURI(keyword),
          format: "json"
        }
      })
    ).map(function(response) {
      var results = [];
      for (var i = 0, ii = response.data[1].length; i < ii; i++) {
        results.push({
          title: response.data[1][i],
          url: response.data[3][i]
        });
      }

      return results;
    });
  }
}
