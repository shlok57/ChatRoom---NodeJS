var express = require('express');
var routes = require('./routes');
var user = require('./routes/user')
var http = require('http');
var path = require('path');
var usernames = [];
var usernames_list = [];

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
	console.log(MongoURI);
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
			var collection = db.collection('chat_messages');
			var stream = collection.find().sort({'date':1}).stream();
			stream.on('data', function (chat) { console.log('emitting chat'); socket.emit('chat', chat.content, chat.date, chat.user_name); });
			var collection = db.collection('users');
			var stream_user = collection.find().stream();
			stream_user.on('data', function (user) { usernames_list.push(user.name); });			
		}
	});

	socket.on('disconnect', function () {
		console.log('user disconnected');
		if(!socket.uname) return;
		// delete usernames[socket.uname];
	});

	socket.on('new_user', function(data, callback){
		if(data in usernames){
			console.log('User ' + data + ' already active');
			callback(true);
		}
		else{
			callback(true);
			socket.uname = data;
			usernames[data] = socket;
			if (usernames_list.indexOf(data) == -1) {
				usernames_list.push(data);
				mongo.connect(MongoURI, function (err, db) {
					if(err){
						console.warn(err.message);
					} else {
						var collection = db.collection('users');
						collection.insert({ name: data, chats: []}, function (err, o) {
							if (err) { console.warn(err.message); }
							else { console.log("New User Created: " + data); }
						});
					}
				});
			}
			console.log('From new_user else: '+Object.keys(usernames));
		}
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

	socket.on('chat_to', function(data, fromname,callback){
		if(data in usernames){
			callback(123);
			socket.to = data;			
			socket.uname = fromname;
			var collection_name = getCollectionName(socket.uname, socket.to);
			mongo.connect(MongoURI, function (err, db) {
				if(err){
					console.warn(err.message);
				} else {
					var collection = db.collection(collection_name);
					var stream = collection.find().sort({'date':1}).stream();
					stream.on('data', function (chat) { socket.emit('chat_pri', chat.content, chat.date, chat.from); });					
				}
			});
		}
		else{
			console.log(usernames);
			callback(false);			
		}
		// console.log(usernames);
	});

	socket.on('chat_pri', function (msg, dt, chatname) {
		mongo.connect(MongoURI, function (err, db) {
			if(err){
				console.warn(err.message);
			} else {
				// console.log('chatname ' + chatname);
				// console.log('socket.to ' + socket.to);
				
				var collection_name = getCollectionName(socket.uname, socket.to);
				var collection = db.collection('users');

				collection.update({$and: [{name: socket.uname}, {name: socket.to}]}, {$addToSet : {chats: collection_name}}, function (err){
					if(err) {console.warn(err);}
					else {
						console.log('chatname included');
					}
				});
				
				var collection = db.collection(collection_name);
				collection.insert({ content: msg, date: dt , from:socket.uname, to:socket.to }, function (err, o) {
					if (err) { console.warn(err.message); }
					else { console.log("chat message inserted into db: " + msg + "\nAnd o: " + o); }
				});
			}
		});
		console.log('chat_pri: ' + Object.keys(usernames));
		usernames[socket.to].emit('chat_pri', msg, dt, socket.uname);
	});

	socket.on('change_socket', function(uname){
		socket.uname = uname;
		usernames[uname] = socket;
	});
});

function getCollectionName(a,b) {
	var sname = a > b ? a : b;
	var bname = a < b ? a : b;
	return sname + '_and_' + bname;
}