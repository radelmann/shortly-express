var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt');
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

var GITHUB_CLIENT_ID = "db37fd8e98e3b468aaa6";
var GITHUB_CLIENT_SECRET = "e99b28f3927a9ea4c993c37146eeab8bf94e305e";

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:4568/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    new User({
      'profile_id': profile.id,
      'username': profile.username
    }).fetch().then(function(results) {
      if (results) {
        return done(null, profile);
      } else {
        new User({
          'profile_id': profile.id,
          'username': profile.username,
          'password': ''
        }).save().then(function() {
          //Redirect to root
          //res.redirect('/');
          return done(null, profile);
        });
      }
    });
  }
));



app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static(__dirname + '/public'));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/github',
  passport.authenticate('github'),
  function(req, res) {
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });

app.get('/auth/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    console.log('logged in');
    res.redirect('/');
  });

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

function restrict(req, res, next) {
  // console.log("req.session.user is:", req.session.user);
  if (req.session.user) {
    next();
  } else {
    // console.log('redirect');
    // req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}

app.get('/', ensureAuthenticated,
  function(req, res) {
    res.render('index');
  });

app.get('/create', ensureAuthenticated,
  function(req, res) {
    res.render('index');
  });

app.get('/links', ensureAuthenticated,
  function(req, res) {
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
  });

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.post('/links',
  function(req, res) {
    var uri = req.body.url;

    if (!util.isValidUrl(uri)) {
      console.log('Not a valid url: ', uri);
      return res.send(404);
    }

    new Link({
      url: uri
    }).fetch().then(function(found) {
      if (found) {
        res.send(200, found.attributes);
      } else {
        util.getUrlTitle(uri, function(err, title) {
          if (err) {
            console.log('Error reading URL heading: ', err);
            return res.send(404);
          }

          Links.create({
              url: uri,
              title: title,
              base_url: req.headers.origin
            })
            .then(function(newLink) {
              res.send(200, newLink);
            });
        });
      }
    });
  });

/************************************************************/
// Write your authentication routes here
/************************************************************/

//Handle login request
app.get('/login', function(req, res) {
  res.render(__dirname + '/views/login.ejs');
});

// app.get('/logout', function(req, res) {
//   req.session.destroy(function() {
//     res.redirect('/');
//   });
// });

//Handle signup request
app.get('/signup', function(req, res) {
  res.render(__dirname + '/views/signup.ejs');
});

app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({
    'username': username,
  }).fetch().then(function(results) {
    console.log('results:' + results);
    if (results) {
      bcrypt.compare(password, results.get('password'), function(err, result) {
        console.log(result);
        if (result) {
          //login
          req.session.regenerate(function() {
            req.session.user = req.body.username;
            res.redirect('/');
          });
        } else {
          res.redirect('/login');
        }
      });
    } else {
      res.redirect('/login');
    }
  });
});

app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(password, salt, function(err, hash) {
      new User({
        'username': username,
        'password': hash
      }).save().then(function() {
        //Redirect to index
        req.session.regenerate(function() {
          req.session.user = req.body.username;
          console.log('new user:' + req.session.user);
          res.redirect('/');
        });
      });
    });
  });
});

//Handle logout request
//take user back to the main page
//clear session


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({
    code: req.params[0]
  }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);