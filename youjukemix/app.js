var app = angular.module('YouJukeMix', []);

app.run(function () {
  var tag = document.createElement('script');
  tag.src = "http://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
});


app.config( function ($httpProvider) {
  delete $httpProvider.defaults.headers.common['X-Requested-With'];
});


app.service('VideosService', ['$window', '$rootScope', '$log', function ($window, $rootScope, $log) {

  var service = this;
  var youtube = {
    ready: false,
    player: null,
    playerId: null,
    videoId: null,
    videoTitle: null,
    playerHeight: '210',
    playerWidth: '280',
    state: 'stopped'
  };
  var results = [];
  var upcoming = [];

  $window.onYouTubeIframeAPIReady = function () {
    youtube.ready = true;
    service.bindPlayer('placeholder');
    service.loadPlayer();
    $rootScope.$apply();
  };

  function onYoutubeStateChange (event) {
    if (event.data == YT.PlayerState.PLAYING) {
      youtube.state = 'playing';
    } else if (event.data == YT.PlayerState.PAUSED) {
      youtube.state = 'paused';
    } else if (event.data == YT.PlayerState.ENDED) {
      youtube.state = 'ended';
      service.launchPlayer(upcoming[0].id, upcoming[0].title);
      // service.archiveVideo(upcoming[0].id, upcoming[0].title);
      // service.deleteVideo(upcoming, upcoming[0].id);
    }
    $rootScope.$apply();
  }

  this.bindPlayer = function (elementId) {
    $log.info('Binding to ' + elementId);
    youtube.playerId = elementId;
  };

  this.createPlayer = function () {
    $log.info('Creating a new Youtube player for DOM id ' + youtube.playerId + ' and video ' + youtube.videoId);
    return new YT.Player(youtube.playerId, {
      height: youtube.playerHeight,
      width: youtube.playerWidth,
      playerVars: {
        rel: 0,
        showinfo: 0
      },
      events: {
        'onStateChange': onYoutubeStateChange
      }
    });
  };

  this.loadPlayer = function () {
    if (youtube.ready && youtube.playerId) {
      if (youtube.player) {
        youtube.player.destroy();
      }
      youtube.player = service.createPlayer();
    }
  };

  this.launchPlayer = function (id, title) {
    youtube.player.loadVideoById(id);
    youtube.videoId = id;
    youtube.videoTitle = title;
    return youtube;
  }

  this.listResults = function (data) {
    results.length = 0;
    for (var i = data.items.length - 1; i >= 0; i--) {
      results.push({
        id: data.items[i].id.videoId,
        title: data.items[i].snippet.title,
        description: data.items[i].snippet.description,
        thumbnail: data.items[i].snippet.thumbnails.default.url,
        author: data.items[i].snippet.channelTitle
      });
    }
    return results;
  }

  this.queueVideo = function (id, title) {
    upcoming.push({
      id: id,
      title: title
    });
    return upcoming;
  };

  this.deleteVideo = function (list, id) {
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].id === id) {
        list.splice(i, 1);
        break;
      }
    }
  };

  this.getYoutube = function () {
    return youtube;
  };

  this.getResults = function () {
    return results;
  };

  this.getUpcoming = function () {
    return upcoming;
  };
}]);


app.controller('VideosController', function ($scope, $http, $log, VideosService) {

    init();

    function init() {
      $scope.youtube = VideosService.getYoutube();
      $scope.results = VideosService.getResults();
      $scope.upcoming = VideosService.getUpcoming();
      $scope.playlist = true;
    }

    $scope.launch = function (id, title) {
      VideosService.launchPlayer(id, title);
      $log.info('Launched id:' + id + ' and title:' + title);
    };

    $scope.queue = function (id, title, state) {
      VideosService.queueVideo(id, title);
      if (state === "stopped") {
        VideosService.launchPlayer(id, title);
      }
      $log.info('Queued id:' + id + ' and title:' + title);
    };

    $scope.delete = function (list, id) {
      VideosService.deleteVideo($scope.upcoming, id);
    };

    $scope.search = function () {
      $http.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: 'AIzaSyDo5Xhj4cJBTpG1Uogx6bur14BCRRP8t4c',
          type: 'video',
          mine: 'true',
          maxResults: '25',
          part: 'id,snippet',
          //part: 'snippet,fileDetails',
          fields: 'items/id,items/snippet/title,items/snippet/description,items/snippet/thumbnails/default,items/snippet/channelTitle',
          q: this.query
        }
      })
      .success( function (data) {
        VideosService.listResults(data);
        $log.info(data);
      })
      .error( function () {
        $log.info('Search error');
      });
    }

    $scope.tabulate = function (state) {
      $scope.playlist = state;
    }
});
