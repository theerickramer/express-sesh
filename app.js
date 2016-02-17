// **** SETUP SERVER
var express = require('express');
var app = express();

var server = app.listen(8000, function(){
	console.log('App started on localhost:8000')
});

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

// override with POST having ?_method=DELETE
var methodOverride = require('method-override');
app.use(methodOverride('_method'))

app.set('view engine', 'ejs');
var expressLayouts = require('express-ejs-layouts');

// **** SESSION
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var mongoose = require('mongoose');
var ObjectId = require('mongodb').ObjectID;
mongoose.connect('mongodb://localhost:27017/test');

app.use(session({
	secret: 'kitkat',
	store: new MongoStore({ mongooseConnection: mongoose.connection })
}))

var User = mongoose.model('User', { username: String, password: String})

// **** AUTH  
var bcrypt = require('bcryptjs');

function userExists(req, res, next){
	User.find({ username: req.body.username}, function(err, user){
		if (user.length > 0) {
			app.locals.error = 'Username already exists';
			res.redirect('/')
		} else {
			next()
		}
	})
}

function checkAuth(req, res, next) {
	if (!req.session.user_id) {
		res.send('Access Denied');
	} else {
		next()
	}
}

// **** ROUTES
app.get('/', function(req, res) {
	res.render('index', {error: app.locals.error})
})

app.get('/users', function(req, res) {
	User.find(function(err, users) {
		if (err) return console.error(err);
		console.log(users)		
	})
})

app.post('/signup', userExists, function(req, res) {
	bcrypt.genSalt(10, function(err, salt) {
		bcrypt.hash(req.body.password, salt, function(err, hash) {
			var user = new User({ username: req.body.username, password: hash });
			user.save(function(err, user) {
				if (err) return console.error(err);
				console.log(user.username + ' created')
				delete app.locals.error
				req.session.user_id = user._id;
				res.redirect('/welcome')
			})
		})
	})
})

app.post('/login', function(req, res) {
	User.find({ username: req.body.username}, function(err, user){
		bcrypt.compare(req.body.password, user[0].password, function(err, response) {
			if (response) {
				req.session.user_id = user[0]._id;
				res.redirect('/welcome')
			} else {
				app.locals.error = 'Incorrect username or password';
				res.redirect('/')
			}
		})
	})
})

app.all('*', checkAuth, function(req, res, next) {
	next()
})

app.get('/welcome', function(req, res) {
	User.find({ _id: ObjectId(req.session.user_id)}, function(err, user){
		res.render('welcome', {username: user[0].username });
	})
})

app.get('/secret', function(req, res) {
	res.send('Shhh, it\'s a secret');
})

app.delete('/logout', function(req, res){
	req.session.destroy()
	res.redirect('/')
})