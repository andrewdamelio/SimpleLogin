'use strict';

var app = angular.module('simpleLoginApp', ['firebase','ngRoute','ngAnimate']);

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'LoginCtrl'
      })
      .when('/profile', {
        templateUrl: 'views/profile.html',
        controller: 'ProfileCtrl'
      })
      .when('/user', {
        templateUrl: 'views/user.html',
        controller: 'UserCtrl'
      })
      .otherwise({
        redirectTo :  '/'
        //templateUrl: '404.html'
      });
  }]);

app.constant('FIREBASE_URI', 'https://toronto.firebaseio.com/');

app.factory('FirebaseService', ['$firebase', '$firebaseSimpleLogin', 'FIREBASE_URI', function($firebase, $firebaseSimpleLogin, FIREBASE_URI) {
  var getUserProfile = function(provider) {
    var myDataRef = new Firebase(FIREBASE_URI+'users/'+provider);
    return $firebase(myDataRef);
  };

  var getUserAuth = function(fn) {
    var test = new FirebaseSimpleLogin(new Firebase(FIREBASE_URI), fn);
    return test;
  };

  return {
    getUserProfile : getUserProfile,
    getUserAuth : getUserAuth
  };
}]);

app.controller('MainCtrl', ['$scope', '$timeout', '$location', 'FirebaseService', function ($scope, $timeout, $location, FirebaseService) {

  $scope.currentUser  = '';
  $scope.newUser = { email: '', password: '' };
  $scope.key = '';
  $scope.logged ='';

  $scope.authCallback = function(error, user) {
    if (error) {
    // an error occurred while attempting login
      if (error.code === 'INVALID_PASSWORD') {
        toastr.clear();
        toastr.error('The email or password you entered is incorrect.');
        $timeout(function() {
          $scope.reset = true;
        });
      }
      else if (error.code === 'INVALID_USER') {
        toastr.clear();
        toastr.error('The specified user does not exist.');
      }
      else {
        console.log(error);
      }
    }
    else if (user) {
    // user authenticated with Firebase
      console.log(user);
      toastr.clear();
      toastr.success('Successfully logged in.');
      $scope.provider = user.provider;
      $scope.currentUser = user;
      if (user.provider === 'twitter') {
        $scope.currentUser.displayName = user.username;
        $scope.avatar = user.thirdPartyUserData.profile_image_url;
      }
      if (user.provider === 'github') {
        $scope.currentUser.displayName = user.username;
        $scope.avatar = user.thirdPartyUserData.avatar_url;
      }
      if (user.provider === 'password') {
        $scope.currentUser.displayName = user.email;
        $scope.avatar = user.md5_hash;
      }
      if (user.provider === 'google') {
        $scope.currentUser.displayName = user.email;
        $scope.avatar = user.thirdPartyUserData.picture;
      }
      $scope.createProfile($scope.currentUser);
      $scope.$broadcast('reset');
    }
    else {
      // user is logged out
      $scope.currentUser = null;
    }
  };

  $scope.createProfile = function(user) {
    var newUser = true;
    $scope.logged = FirebaseService.getUserProfile(user.provider);
    $scope.logged.$on('loaded', function() {
      var keys = $scope.logged.$getIndex();
      angular.forEach(keys, function(key) {
        if (user.uid === $scope.logged[key].uid) {
          newUser = false;
          $scope.key = key;
          $scope.userProfile = $scope.logged[key];
          console.log('WELCOME BACK');
          $location.url('/user');
        }
      });
      if (newUser) {
        $scope.logged.$add({
          uid : user.uid,
          displayName:  user.displayName,
          showImage: true,
        }).then(function(ref) {
          console.log('FIRST SIGNIN');
          $scope.key = ref.name();
          $scope.userProfile = {uid :user.id, displayName : user.displayName, showImage:true};
          $location.url('/user');
        });
      }
    });
  };
    
  $scope.auth = FirebaseService.getUserAuth($scope.authCallback);

  $scope.$on('reset', function () {
    $scope.newUser = { email: '', password: '' };
    $scope.reset = false;
    $scope.newPassword = '';
    $scope.oldPassword = '';
  });

  $scope.$on('logout', function() {
    $scope.auth.logout();
    $scope.$broadcast('reset');
    $scope.currentUser = null;
    $scope.avatar = null;
    $scope.provider = null;
    $location.url('/');
  });

}]);

// Controller for the Profile page
// Functions: logout
app.controller('UserCtrl',['$scope', '$location', function($scope, $location){
  if (!$scope.currentUser) {
    $location.url('/');
  }
  $scope.logout = function() {
    $scope.$emit('logout');
  };
}]);

// Controller for the Profile page
// Functions: - changing users password
// Functions: - updatiing users display name
// Functions: - changing users profiles settings
app.controller('ProfileCtrl',['$scope', '$location', function($scope, $location){
  if (!$scope.currentUser) {
    $location.url('/');
  }
  
  $scope.changePassword = function(password, newPassword) {
    $scope.auth.changePassword($scope.currentUser.email, password, newPassword, function(error, success) {
      if (!error) {
        toastr.clear();
        toastr.info('Password changed successfully');
      }
      else {
        toastr.clear();
        toastr.error(error);
      }
    });
    $scope.$emit('reset');
  };

  $scope.updateProfileImage = function() {
    $scope.logged[$scope.key].showImage = $scope.userProfile.showImage;
    $scope.logged.$save($scope.key);
  };

  $scope.updateDisplayName = function() {
    if (!$scope.userProfile.displayName) {
      $scope.userProfile.displayName = $scope.currentUser.displayName;
    }
    $scope.logged[$scope.key].displayName = $scope.userProfile.displayName;
    $scope.logged.$save($scope.key);
  };

}]);

// Controller for the Login page
app.controller('LoginCtrl',['$scope', '$location' ,function($scope, $location){
  if ($scope.currentUser) {
    $location.url('/user');
  }

  $scope.register = function (email, password) {
    if (email && password) {
      $scope.auth.createUser(email, password, function(error, user) {
        if (!error) {
          $scope.login(email, password);
        }
        else {
          if (error.code === 'EMAIL_TAKEN') {
            toastr.clear();
            toastr.error('The email entered is already taken.');
          }
          else {
            console.log(error);
          }
        }
      });
    }
  };

  $scope.login = function (email, password) {
    if (email  && password) {
      $scope.auth.login('password', {
        email: email,
        password: password
      });
    }
  };

  $scope.google = function() {
    $scope.auth.login('google');
  };

  $scope.github = function() {
    $scope.auth.login('github');
  };

  $scope.twitter = function() {
    $scope.auth.login('twitter');
  };

  $scope.resetPassword = function(email) {
    if (email) {
      $scope.auth.sendPasswordResetEmail(email, function(error, success) {
        if (!error) {
          toastr.clear();
          toastr.info('Password reset email sent successfully');
        }
        else {
          toastr.clear();
          toastr.error(error);
        }
      });
      $scope.$emit('reset');
    }
  };
}]);

app.directive('avatar', [function () {
  return {
    restrict: 'E',
    replace : true,
    template : '<img />',
    link: function (scope, element, attrs) {
      attrs.$observe('provider', function(newValue, oldValue) {
        if  (newValue !== oldValue) {
          if (scope.provider === 'google' ||  scope.provider === 'github' || scope.provider === 'twitter') {
            attrs.$set('src', scope.avatar);
          }
          else if (scope.provider === 'password') {
            attrs.$set('src', 'http://gravatar.com/avatar/' + scope.avatar + '.jpg?s=200&r=g');
          }
        }
      });
    }
  };
}]);

app.directive('google',[function(){
  return {
    restrict: 'A',
    template: '<svg  class="svg" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"width="134.658px" height="131.646px" viewBox="0 0 134.658 131.646" enable-background="new 0 0 134.658 131.646"xml:space="preserve"><g><path fill="#DC4A38" d="M126.515,4.109H8.144c-2.177,0-3.94,1.763-3.94,3.938v115.546c0,2.179,1.763,3.942,3.94,3.942h118.371c2.177,0,3.94-1.764,3.94-3.942V8.048C130.455,5.872,128.691,4.109,126.515,4.109z"/><g><path fill="#FFFFFF" d="M70.479,71.845l-3.983-3.093c-1.213-1.006-2.872-2.334-2.872-4.765c0-2.441,1.659-3.993,3.099-5.43c4.64-3.652,9.276-7.539,9.276-15.73c0-8.423-5.3-12.854-7.84-14.956h6.849l7.189-4.517H60.418c-5.976,0-14.588,1.414-20.893,6.619c-4.752,4.1-7.07,9.753-7.07,14.842c0,8.639,6.633,17.396,18.346,17.396c1.106,0,2.316-0.109,3.534-0.222c-0.547,1.331-1.1,2.439-1.1,4.32c0,3.431,1.763,5.535,3.317,7.528c-4.977,0.342-14.268,0.893-21.117,5.103c-6.523,3.879-8.508,9.525-8.508,13.51c0,8.202,7.731,15.842,23.762,15.842c19.01,0,29.074-10.519,29.074-20.932C79.764,79.709,75.344,75.943,70.479,71.845z M56,59.107c-9.51,0-13.818-12.294-13.818-19.712c0-2.888,0.547-5.87,2.428-8.199c1.773-2.218,4.861-3.657,7.744-3.657c9.168,0,13.923,12.404,13.923,20.382c0,1.996-0.22,5.533-2.762,8.09C61.737,57.785,58.762,59.107,56,59.107z M56.109,103.65c-11.826,0-19.452-5.657-19.452-13.523c0-7.864,7.071-10.524,9.504-11.405c4.64-1.561,10.611-1.779,11.607-1.779c1.105,0,1.658,0,2.538,0.111c8.407,5.983,12.056,8.965,12.056,14.629C72.362,98.542,66.723,103.65,56.109,103.65z"/><polygon fill="#FFFFFF" points="98.393,58.938 98.393,47.863 92.923,47.863 92.923,58.938 81.866,58.938 81.866,64.469 92.923,64.469 92.923,75.612 98.393,75.612 98.393,64.469 109.506,64.469 109.506,58.938     "/></g></g></svg>'
  };
}]);

app.directive('github',[function(){
  return {
    restrict: 'A',
    template: '<svg class="svg"  xmlns="http://www.w3.org/2000/svg" viewBox="-0.2 -1 379 334"><path id="puddle" fill="#9CDAF1" d="m296.94 295.43c0 20.533-47.56 37.176-106.22 37.176-58.67 0-106.23-16.643-106.23-37.176s47.558-37.18 106.23-37.18c58.66 0 106.22 16.65 106.22 37.18z"/><g id="shadow-legs" fill="#7DBBE6"><path d="m161.85 331.22v-26.5c0-3.422-.619-6.284-1.653-8.701 6.853 5.322 7.316 18.695 7.316 18.695v17.004c6.166.481 12.534.773 19.053.861l-.172-16.92c-.944-23.13-20.769-25.961-20.769-25.961-7.245-1.645-7.137 1.991-6.409 4.34-7.108-12.122-26.158-10.556-26.158-10.556-6.611 2.357-.475 6.607-.475 6.607 10.387 3.775 11.33 15.105 11.33 15.105v23.622c5.72.98 11.71 1.79 17.94 2.4z"/><path d="m245.4 283.48s-19.053-1.566-26.16 10.559c.728-2.35.839-5.989-6.408-4.343 0 0-19.824 2.832-20.768 25.961l-.174 16.946c6.509-.025 12.876-.254 19.054-.671v-17.219s.465-13.373 7.316-18.695c-1.034 2.417-1.653 5.278-1.653 8.701v26.775c6.214-.544 12.211-1.279 17.937-2.188v-24.113s.944-11.33 11.33-15.105c0-.01 6.13-4.26-.48-6.62z"/></g><path id="cat" d="m378.18 141.32l.28-1.389c-31.162-6.231-63.141-6.294-82.487-5.49 3.178-11.451 4.134-24.627 4.134-39.32 0-21.073-7.917-37.931-20.77-50.759 2.246-7.25 5.246-23.351-2.996-43.963 0 0-14.541-4.617-47.431 17.396-12.884-3.22-26.596-4.81-40.328-4.81-15.109 0-30.376 1.924-44.615 5.83-33.94-23.154-48.923-18.411-48.923-18.411-9.78 24.457-3.733 42.566-1.896 47.063-11.495 12.406-18.513 28.243-18.513 47.659 0 14.658 1.669 27.808 5.745 39.237-19.511-.71-50.323-.437-80.373 5.572l.276 1.389c30.231-6.046 61.237-6.256 80.629-5.522.898 2.366 1.899 4.661 3.021 6.879-19.177.618-51.922 3.062-83.303 11.915l.387 1.36c31.629-8.918 64.658-11.301 83.649-11.882 11.458 21.358 34.048 35.152 74.236 39.484-5.704 3.833-11.523 10.349-13.881 21.374-7.773 3.718-32.379 12.793-47.142-12.599 0 0-8.264-15.109-24.082-16.292 0 0-15.344-.235-1.059 9.562 0 0 10.267 4.838 17.351 23.019 0 0 9.241 31.01 53.835 21.061v32.032s-.943 11.33-11.33 15.105c0 0-6.137 4.249.475 6.606 0 0 28.792 2.361 28.792-21.238v-34.929s-1.142-13.852 5.663-18.667v57.371s-.47 13.688-7.551 18.881c0 0-4.723 8.494 5.663 6.137 0 0 19.824-2.832 20.769-25.961l.449-58.06h4.765l.453 58.06c.943 23.129 20.768 25.961 20.768 25.961 10.383 2.357 5.663-6.137 5.663-6.137-7.08-5.193-7.551-18.881-7.551-18.881v-56.876c6.801 5.296 5.663 18.171 5.663 18.171v34.929c0 23.6 28.793 21.238 28.793 21.238 6.606-2.357.474-6.606.474-6.606-10.386-3.775-11.33-15.105-11.33-15.105v-45.786c0-17.854-7.518-27.309-14.87-32.3 42.859-4.25 63.426-18.089 72.903-39.591 18.773.516 52.557 2.803 84.873 11.919l.384-1.36c-32.131-9.063-65.692-11.408-84.655-11.96.898-2.172 1.682-4.431 2.378-6.755 19.25-.80 51.38-.79 82.66 5.46z"/><path id="face" fill="#F4CBB2" d="m258.19 94.132c9.231 8.363 14.631 18.462 14.631 29.343 0 50.804-37.872 52.181-84.585 52.181-46.721 0-84.589-7.035-84.589-52.181 0-10.809 5.324-20.845 14.441-29.174 15.208-13.881 40.946-6.531 70.147-6.531 29.07-.004 54.72-7.429 69.95 6.357z"/><path id="eyes" fill="#FFF" d="m160.1 126.06 c0 13.994-7.88 25.336-17.6 25.336-9.72 0-17.6-11.342-17.6-25.336 0-13.992 7.88-25.33 17.6-25.33 9.72.01 17.6 11.34 17.6 25.33z m94.43 0 c0 13.994-7.88 25.336-17.6 25.336-9.72 0-17.6-11.342-17.6-25.336 0-13.992 7.88-25.33 17.6-25.33 9.72.01 17.6 11.34 17.6 25.33z"/><g fill="#AD5C51"><path id="pupils" d="m154.46 126.38 c0 9.328-5.26 16.887-11.734 16.887s-11.733-7.559-11.733-16.887c0-9.331 5.255-16.894 11.733-16.894 6.47 0 11.73 7.56 11.73 16.89z m94.42 0 c0 9.328-5.26 16.887-11.734 16.887s-11.733-7.559-11.733-16.887c0-9.331 5.255-16.894 11.733-16.894 6.47 0 11.73 7.56 11.73 16.89z"/><circle id="nose" cx="188.5" cy="148.56" r="4.401"/><path id="mouth" d="m178.23 159.69c-.26-.738.128-1.545.861-1.805.737-.26 1.546.128 1.805.861 1.134 3.198 4.167 5.346 7.551 5.346s6.417-2.147 7.551-5.346c.26-.738 1.067-1.121 1.805-.861s1.121 1.067.862 1.805c-1.529 4.324-5.639 7.229-10.218 7.229s-8.68-2.89-10.21-7.22z"/></g><path id="octo" fill="#C3E4D8" d="m80.641 179.82 c0 1.174-1.376 2.122-3.07 2.122-1.693 0-3.07-.948-3.07-2.122 0-1.175 1.377-2.127 3.07-2.127 1.694 0 3.07.95 3.07 2.13z m8.5 4.72 c0 1.174-1.376 2.122-3.07 2.122-1.693 0-3.07-.948-3.07-2.122 0-1.175 1.377-2.127 3.07-2.127 1.694 0 3.07.95 3.07 2.13z m5.193 6.14 c0 1.174-1.376 2.122-3.07 2.122-1.693 0-3.07-.948-3.07-2.122 0-1.175 1.377-2.127 3.07-2.127 1.694 0 3.07.95 3.07 2.13z m4.72 7.08 c0 1.174-1.376 2.122-3.07 2.122-1.693 0-3.07-.948-3.07-2.122 0-1.175 1.377-2.127 3.07-2.127 1.694 0 3.07.95 3.07 2.13z m5.188 6.61 c0 1.174-1.376 2.122-3.07 2.122-1.693 0-3.07-.948-3.07-2.122 0-1.175 1.377-2.127 3.07-2.127 1.694 0 3.07.95 3.07 2.13z m7.09 5.66 c0 1.174-1.376 2.122-3.07 2.122-1.693 0-3.07-.948-3.07-2.122 0-1.175 1.377-2.127 3.07-2.127 1.694 0 3.07.95 3.07 2.13z m9.91 3.78 c0 1.174-1.376 2.122-3.07 2.122-1.693 0-3.07-.948-3.07-2.122 0-1.175 1.377-2.127 3.07-2.127 1.694 0 3.07.95 3.07 2.13z m9.87 0 c0 1.174-1.376 2.122-3.07 2.122-1.693 0-3.07-.948-3.07-2.122 0-1.175 1.377-2.127 3.07-2.127 1.694 0 3.07.95 3.07 2.13z m10.01 -1.64 c0 1.174-1.376 2.122-3.07 2.122-1.693 0-3.07-.948-3.07-2.122 0-1.175 1.377-2.127 3.07-2.127 1.694 0 3.07.95 3.07 2.13z"/><path id="drop" fill="#9CDAF1" d="m69.369 186.12l-3.066 10.683s-.8 3.861 2.84 4.546c3.8-.074 3.486-3.627 3.223-4.781z"/></svg>'
  };
}]);

app.directive('twitter',[function(){
  return {
    restrict: 'A',
    template: '<svg class="svg" viewbox="0 0 2000 1625.36"version="1.1"xmlns="http://www.w3.org/2000/svg"><path fill="#55ACEE"d="m 1999.9999,192.4 c -73.58,32.64 -152.67,54.69 -235.66,64.61 84.7,-50.78 149.77,-131.19 180.41,-227.01 -79.29,47.03 -167.1,81.17 -260.57,99.57 C 1609.3399,49.82 1502.6999,0 1384.6799,0 c -226.6,0 -410.328,183.71 -410.328,410.31 0,32.16 3.628,63.48 10.625,93.51 -341.016,-17.11 -643.368,-180.47 -845.739,-428.72 -35.324,60.6 -55.5583,131.09 -55.5583,206.29 0,142.36 72.4373,267.95 182.5433,341.53 -67.262,-2.13 -130.535,-20.59 -185.8519,-51.32 -0.039,1.71 -0.039,3.42 -0.039,5.16 0,198.803 141.441,364.635 329.145,402.342 -34.426,9.375 -70.676,14.395 -108.098,14.395 -26.441,0 -52.145,-2.578 -77.203,-7.364 52.215,163.008 203.75,281.649 383.304,284.946 -140.429,110.062 -317.351,175.66 -509.5972,175.66 -33.1211,0 -65.7851,-1.949 -97.8828,-5.738 181.586,116.4176 397.27,184.359 628.988,184.359 754.732,0 1167.462,-625.238 1167.462,-1167.47 0,-17.79 -0.41,-35.48 -1.2,-53.08 80.1799,-57.86 149.7399,-130.12 204.7499,-212.41"/></svg>'
  };
}]);
