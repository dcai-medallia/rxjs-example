angular
  .module('app', ['rx'])
  .controller('AppController', AppController)
;


function AppController($scope, $log, $http, rx, observeOnScope) {

  //
  // Auto search demo
  // Reduce the amount of REST calls by throttling user typings
  //

  $scope.keyword = '';
  $scope.results = [];


  // Instead of using Angular's watch function,
  // we use observeOnScope to create an observable stream.
  observeOnScope($scope, 'keyword')
    .debounce(500)
    .map(function(change){
      $log.log(change);
      return change.newValue || '';
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
  // Uncomment one of four examples to see the results
  //

  // Return a stream wrapping a HTTP promise without
  // invoking the actual HTTP request.
  function getStreamSource(url) {
    return rx.Observable.just(url).
      flatMap(function(url) { return $http.get(url); });
  }

  var POST_URL = 'http://jsonplaceholder.typicode.com/posts/1';
  var COMMENT_URL = 'http://jsonplaceholder.typicode.com/comments/1';
  var postSource = getStreamSource(POST_URL);
  var commentSource = getStreamSource(COMMENT_URL);


  // 1. ForkJoin example
  // Parallel: Run both Post and Comment in parallel.

  // var source = rx.Observable.forkJoin(
  //   postSource,
  //   commentSource,
  //
  //   // Selector function to massage/concat response data
  //   function(postRes, commentRes) {
  //     return {
  //       post: postRes.data,
  //       comment: commentRes.data
  //     }
  //   }
  // );


  // 2. Zip example
  // Sequential: Post runs before Comment.
  // However, requests don't depend on each other's response.

  // var source = rx.Observable.zip(
  //   postSource,
  //   commentSource,
  //
  //   // Selector function to massage/concat response data
  //   function(postRes, commentRes) {
  //     return {
  //       post: postRes.data,
  //       comment: commentRes.data
  //     };
  //   }
  // );


  // 3. And/Then/When example (Pattern and Plan)
  // Sequential: Post runs before Comment.
  // However, requests don't depend on each other's response.
  // Same as the Zip example.

  // var source = rx.Observable.when(
  //   postSource.and(commentSource).thenDo(function(postRes, commentRes) {
  //     return {
  //       post: postRes.data,
  //       comment: commentRes.data
  //     };
  //   }
  // ));


  // 4. Master-detail (Cascading) relationship example
  // Sequential: Comment request depends on the response from the Post request.
  // Check network console to see if Post responses precede Comment requests.

  var source = postSource
    .flatMap(function(postRes) {
      return rx.Observable.zip(
        // Pass through the Post response
        rx.Observable.of(postRes),

        // Set up the Comment request using ID from the Post response
        getStreamSource('http://jsonplaceholder.typicode.com/comments/' + postRes.data.id),

        // Selector function to massage/concat response data
        function(postRes, commentRes) {
          return {
            post: postRes.data,
            comment: commentRes.data
          };
        }
      );
    }
  );


  // Transform DOM events to stream source
  var subscription = $scope.$createObservableFunction('start')
    .safeApply($scope, function() {
      $scope.restResult = {};
    })
    .flatMap(function() { return source; })
    .safeApply($scope, function(results) {
      $scope.restResult = results;
    })
    // At this moment, no HTTP request is made until subscribe is called
    .subscribe();


  // Uncomment the following line to cancel the subscription.
  // No REST HTTP request will be sent.

  // subscription.dispose();
}
