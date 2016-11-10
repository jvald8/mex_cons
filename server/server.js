require(`dotenv`).config();

var express = require('express'),
	app = express(),
	bodyParser = require('body-parser'),
	fs = require('fs'),
	path = require('path'),
	_ = require('lodash');

var userDb = require('../database/user');

if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./scratch');
}

var passport = require('passport'),
	FacebookStrategy = require('passport-facebook').Strategy;

var FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID,
	FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(passport.initialize());
app.use(passport.session());

var port = process.env.PORT || 8080;

passport.use(new FacebookStrategy({
  clientID: FACEBOOK_APP_ID,
  clientSecret: FACEBOOK_APP_SECRET,
  callbackURL: 'http://localhost:8080/auth/facebook/callback',
  profileFields: ['id', 'email', 'gender', 'link', 'locale', 'name', 'timezone', 'updated_time', 'verified', 'picture.type(large)', 'friends']
}, function(accessToken, refreshToken, profile, done) {
  process.nextTick(function() {
    //Assuming user exists
    localStorage.setItem('user', JSON.stringify(profile));

    userDb.getUser(profile, function(req, res) {
      
      done(null, profile)

    });
  });
}));

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback', passport.authenticate('facebook', {
  scope: ['id', 'email', 'gender', 'link', 'locale', 'name', 'timezone', 'updated_time', 'verified', 'picture.type(large)', 'friends'],
  successRedirect: '/success',
  failureRedirect: '/error'
}));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

app.get('/login', function(req, res) {
	res.send('<a href="/auth/facebook">Sign in with Facebook</a>')
})

app.get('/success', function(req, res, next) {

  var profileId = JSON.parse(localStorage.getItem('user')).id;

  userDb.profileFinished(profileId, res);

});

app.set('views' ,'./views');

app.set('view engine', 'pug');

app.get('/finishProfile', function(req, res, next) {

	var user = JSON.parse(localStorage.getItem('user')),
		id = user.id,
		name = user.name.givenName,
		photo = user.photos[0].value;

	res.render('finishProfile', { id: id, name: name, photo: photo});
})

app.get('/error', function(req, res, next) {
  res.send("Error logging in.");
});

app.get('/logout', function(req, res) {
	localStorage.removeItem('user');
	res.redirect('/login')
});

// let's send the app file if loggedin
app.get('/app', loggedIn, function(req, res, next) {
  var id = JSON.parse(localStorage.getItem('user')).id;

  

  userDb.getUserObject(id, function(err, user) {
    if(err) {
      throw err
    }

    console.log({user:user[0]})

    res.render('home', {user: user[0]})
  })

});

var router = express.Router();

router.use(function(req, res, next) {
	console.log('something is happening');
	next();
})

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

router.post('/finishProfile', loggedIn, addUserIdtoReqBody, userDb.addUserEmailandLocation);

router.post('/addRestOfInfo', loggedIn, userDb.addRestOfInfo);

app.use('/api', router);

app.listen(port);
console.log(`Magic happens on port ${port}`);


function loggedIn(req, res, next) {
	//console.log(localStorage.getItem('user'))
    if (!_.isEmpty(localStorage.getItem('user'))) {
        next();
    } else {
        res.redirect('/login');
    }
}

function addUserIdtoReqBody(req, res, next) {
	req.body.id = JSON.parse(localStorage.getItem('user')).id;
	next();
}

function addUsertoReqBody(req, res, next) {

  var id = JSON.parse(localStorage.getItem('user')).id;

  userDb.getUserObject(id, function(err, user) {
    if(err) {
      throw err
    }
    console.log({user: user})

    req.body.user = user;

    next();
  })
}