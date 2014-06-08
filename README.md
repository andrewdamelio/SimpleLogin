SimpleLogin
===========

Authentication demo using AngularJS and
<a href='https://www.firebase.com/docs/security/simple-login-overview.html'>Firebase Simple Login</a>. 
  - uses only client-side code
  - third-party authentication - google/github/twitter
  - email / password authentication
  - user profiles

<a href='http://bittopia.ca/dev/SimpleLogin'>SimpleLogin Demo</a>


<h4>Authenticating Setup</h4>

<a href="https://www.firebase.com/docs/security/simple-login-email-password.html">Email / Password Authentication</a><br />
<a href="https://www.firebase.com/docs/security/simple-login-google.html">Authenticating with Google</a><br />
<a href="https://www.firebase.com/docs/security/simple-login-twitter.html">Authenticating with Twitter</a><br />
<a href="https://www.firebase.com/docs/security/simple-login-github.html">Authenticating with GitHub</a><br />

<h4>Firebase Security Rules</h4>

Below are the firebase security rules being used.


        {  
          "rules": {   
          ".read": true,
              "users": {
                "github" : {
                  "$githubid": {
                    ".write": "auth.uid === newData.child('uid').val() || auth.uid === data.child('uid').val()"
                  }
                },
                "google" : {
                  "$googleid": {
                    ".write": "auth.uid === newData.child('uid').val() || auth.uid === data.child('uid').val()"
                  }
                },
                "twitter" : {
                  "$twitterid": {
                    ".write": "auth.uid === newData.child('uid').val() || auth.uid === data.child('uid').val()"
                  }
                },
                "password" : {
                  "$passwordid": {
                    ".write": "auth.uid === newData.child('uid').val() || auth.uid === data.child('uid').val()"
                  }
                }      
              }
           }
        }

<br />
<sup>built with<a href='https://www.firebase.com/'><img src='http://i.imgur.com/ZVL0Jkt.png'/></sup></a>
