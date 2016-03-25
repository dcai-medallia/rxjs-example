angular
  .module('app', ['rx'])
  .controller('AppController', AppController)
;


function AppController($scope, $log, $http, rx, observeOnScope) {

  //
  // Auto search demo
  //

  $scope.keyword = '';
  $scope.results = [];


  // Instead of using Angular's watch function, we use observeOnScope to create an observable stream
  observeOnScope($scope, 'keyword')
    .debounce(500)
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


  // Create an observable function for DOM events
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


  //
  // $http promises demo
  //

  var postSource = rx.Observable.fromPromise($http.get('http://jsonplaceholder.typicode.com/posts/1'));
  var commentSource = rx.Observable.fromPromise($http.get('http://jsonplaceholder.typicode.com/comments/1'));

  // 1. Zip example
  // Sequential. Post goes before Comment, and requests don't depend on each other's response.
  // var source = rx.Observable.zip(
  //   postSource,
  //   commentSource,
  //   function(postRes, commentRes) {
  //     return {
  //       post: postRes.data,
  //       comment: commentRes.data
  //     };
  //   }
  // );

  // 2. And/Then/When example
  // Sequential. Post goes before Comment, and requests don't depend on each other's response.
  // var source = rx.Observable.when(
  //   postSource.and(commentSource).thenDo(function(postRes, commentRes) {
  //     return {
  //       post: postRes.data,
  //       comment: commentRes.data
  //     };
  //   }
  // ));

  // 3. Sequential. Post goes before Comment, and Comment request depends on the response from Post.
  // var source = postSource
  //   .flatMap(function(postRes) {
  //     $log.log(postRes.data);
  //     return commentSource;
  //   });
  //   // .map(function(commentRes) {
  //   //   $log.log(commentRes);
  //   //   return commentRes;
  //   // });

  // 4. ForkJoin example
  // Parallel. Run both Post and Comment in parallel.
  var source = rx.Observable.forkJoin(
    postSource,
    commentSource,
    function(postRes, commentRes) {
      return {
        post: postRes.data,
        comment: commentRes.data
      }
    }
  );

  $scope.$createObservableFunction('start')
    .flatMap(function() { return source; })
    .safeApply($scope, function(results) {
      $log.log(results);
      $scope.restResult = results;
    })
    .subscribe();
}
