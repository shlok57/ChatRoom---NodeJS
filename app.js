var express = require('express');
var routes = require('./routes');
var user = require('./routes/user')
var http = require('http');
var path = require('path');
var usernames = [];

var app = express();
var mongo = require('mongodb').MongoClient;

app.set('port', process.env.PORT || 8000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
var MongoURI = process.env.CUSTOMCONNSTR_MONGOLAB_URI;

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
	console.log('dev env');
}

app.get('/', routes.index);
app.get('/users', user.list);

var serve = http.createServer(app);
var io = require('socket.io')(serve);

serve.listen(app.get('port'), function(){
	console.log('Express server listening to port: ' + app.get('port'));
});


io.on('connection', function (socket) {
	console.log('a user connected');
	
	mongo.connect(MongoURI, function (err, db) {
		if(err){
			console.warn(err.message);
		} else {
			var collection = db.collection('chat_messages')
			var stream = collection.find().sort({'date':1}).stream();
			stream.on('data', function (chat) { console.log('emitting chat'); socket.emit('chat', chat.content, chat.date, chat.user_name); });
		}
	});

	socket.on('disconnect', function () {
		console.log('user disconnected');
		if(!socket.uname) return;
		usernames.splice(usernames.indexOf(socket.uname), 1);
	});

	socket.on('new_user', function(data, callback){
		if(usernames.indexOf(data) != -1){
			callback(false);
		}
		else{
			callback(true);
			socket.uname = data;
			usernames.push(data);
			socket.emit('new_user_joined', data);
		}
		console.log(usernames);
	});

	socket.on('chat', function (msg, dt, uname) {
		mongo.connect(MongoURI, function (err, db) {
			if(err){
				console.warn(err.message);
			} else {
				var collection = db.collection('chat_messages');
				collection.insert({ content: msg, date: dt , user_name: uname}, function (err, o) {
					if (err) { console.warn(err.message); }
					else { console.log("chat message inserted into db: " + msg + "\nAnd o: " + o); }
				});
			}
		});

		socket.broadcast.emit('chat', msg, dt, uname);
	});
});