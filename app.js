var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var usernames = [];
var usernames_list = [];

var app = express();
// var mongo = require('mongodb').MongoClient;
var mongoose = require('mongoose');

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

mongoose.connect(MongoURI);
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(){
	console.log("Connected to DB");
});

// Schema for the chat 
var globalChatSchema = mongoose.Schema({
	content: String,
	user_name: String,
	date: { type: Date, default: Date.now }
});

var userSchema = mongoose.Schema({
	name: String,
	chats: [String]
});

var privateChatSchema = mongoose.Schema({
	chatname: String,
	chat: [{content: String, date: { type: Date, default: Date.now }, from: String}]
})


var GlobalChat = mongoose.model('GlobalChat', globalChatSchema, "chat_messages");
var User = mongoose.model('User', userSchema, "users");
var PrivateChat = mongoose.model('PrivateChat', privateChatSchema, 'privateChats');

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
	
	// mongo.connect(MongoURI, function (err, db) {
	// 	if(err){
	// 		console.warn(err.message);
	// 	} else {
	// 		var collection = db.collection('chat_messages');
	// 		var stream = collection.find().sort({'date':1}).stream();
	// 		stream.on('data', function (chat) { console.log('emitting chat'); socket.emit('chat', chat.content, chat.date, chat.user_name); });
	// 		var collection = db.collection('users');
	// 		var stream_user = collection.find().stream();
	// 		stream_user.on('data', function (user) { usernames_list.push(user.name); });			
	// 	}
	// });

	var stream = GlobalChat.find().sort({'date':1}).stream();
	stream.on('data', function (chat) { console.log('emitting chat'); socket.emit('chat', chat.content, chat.date, chat.user_name); });

	var stream_user = User.find().stream();
	stream_user.on('data', function (user) { usernames_list.push(user.name); });			

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
				// mongo.connect(MongoURI, function (err, db) {
				// 	if(err){
				// 		console.warn(err.message);
				// 	} else {
				// 		var collection = db.collection('users');
				// 		collection.insert({ name: data, chats: []}, function (err, o) {
				// 			if (err) { console.warn(err.message); }
				// 			else { console.log("New User Created: " + data); }
				// 		});
				// 	}
				// });
				var user_object = new User({
					name: data,
					chats: []
				});
				user_object.save(function(err){
					if(err) console.warn(err.message);
					else {
						console.log("New User Created: " + data);
					}
				});
			}
			console.log('From new_user else: '+Object.keys(usernames));
		}
	});

	socket.on('chat', function (msg, dt, uname) {
		// mongo.connect(MongoURI, function (err, db) {
		// 	if(err){
		// 		console.warn(err.message);
		// 	} else {
		// 		var collection = db.collection('chat_messages');
		// 		collection.insert({ content: msg, date: dt , user_name: uname}, function (err, o) {
		// 			if (err) { console.warn(err.message); }
		// 			else { console.log("chat message inserted into db: " + msg + "\nAnd o: " + o); }
		// 		});
		// 	}
		// });
		var globalchat_object = new GlobalChat({
			content: msg,
			date: dt,
			user_name: uname
		});
		globalchat_object.save(function(err){
			if(err) console.warn(err.message);
			else {
				console.log("chat message inserted into db: " + msg);
			}
		});

		socket.broadcast.emit('chat', msg, dt, uname);
	});

	socket.on('chat_to', function(data, fromname,callback){		
		if(usernames_list.indexOf(data) >= 0){
			socket.to = data;			
			socket.uname = fromname;
			var chat_name = getChatName(socket.uname, socket.to);
			console.log('chat_name: ' + chat_name);
			// mongo.connect(MongoURI, function (err, db) {
			// 	if(err){
			// 		console.warn(err.message);
			// 	} else {
			// 		var collection = db.collection(chat_name);
			// 		var stream = collection.find().sort({'date':1}).stream();
			// 		stream.on('data', function (chat) { socket.emit('chat_pri', chat.content, chat.date, chat.from); });					

			// 		var collection = db.collection('users');

			// 		collection.update({$or: [{name: socket.uname}, {name: socket.to}]}, {$addToSet : {chats: chat_name}},{multi:true}, function (err){
			// 			if(err) {console.warn(err);}
			// 			else {
			// 				console.log('chatname included');
			// 			}
			// 		});
			// 	}
			// });
			console.log('Usernames from chat to :' + Object.keys(usernames));
			// var stream = PrivateChat.find({name: chat_name}).sort({'date':1}).stream();
			// console.log(stream);
			PrivateChat.find({chatname: chat_name}, function(err,chats){
				if(err){
					console.warn(err.message); 
				} else if(chats.length == 0){
					console.log('creating new chat');
					var privatechatobj = new PrivateChat({
						chatname: chat_name,
						chats: []
					});
					privatechatobj.save();
				} else{
					for(var j in chats){
						var pri_chats = chats[j].chat;
						for(var i in pri_chats){
							var temp = pri_chats[i]
							socket.emit('chat_pri', temp.content, temp.date, temp.from);
						}							
					}
				}								
			});
			User.update({$or: [{name: socket.uname}, {name: socket.to}]}, {$addToSet : {chats: chat_name}},{multi:true}, function (err){
				if(err) {console.warn(err);}
				else {
					console.log('chatname included');
				}
			});								
			callback(123);
		}
		else{
			console.log('no user found');
			callback(false);			
		}
			// console.log(usernames);
		});

	socket.on('chat_pri', function (msg, dt, chatname) {
		// mongo.connect(MongoURI, function (err, db) {
		// 	if(err){
		// 		console.warn(err.message);
		// 	} else {
		// 			// console.log('chatname ' + chatname);
		// 			// console.log('socket.to ' + socket.to);

		// 			var chat_name = getChatName(socket.uname, socket.to);	

		// 			var collection = db.collection(chat_name);
		// 			collection.insert({ content: msg, date: dt , from:socket.uname, to:socket.to }, function (err, o) {
		// 				if (err) { console.warn(err.message); }
		// 				else { console.log("chat message inserted into db: " + msg + "\nAnd o: " + o); }
		// 			});
		// 		}
		// 	});
		var chat_name = getChatName(socket.uname, socket.to);	
		console.log('chat_name' + chat_name);
		PrivateChat.update({chatname: chat_name}, {$addToSet : {chat: {content:msg, date: dt, from:socket.uname}}},[{upsert: true}, {multi:true}],function(err, result){
			if(err) console.log(err.message);
			else{
				console.log("chat message inserted into db: " + msg);
			}
		});

		console.log('chat_pri: ' + (usernames));
		if(usernames.indexOf(socket.to) >= 0){
			usernames[socket.to].emit('chat_pri', msg, dt, socket.uname);
		}
	});

	socket.on('change_socket', function(uname){
		console.log('change_socket called ' + uname);
		console.log('socket ' + socket);
		socket.uname = uname;
		usernames[uname] = socket;
		console.log('chat_pri: ' + (usernames));
	});

	socket.on('get_chats', function(uname){
		// mongo.connect(MongoURI, function (err, db) {
		// 	if(err){
		// 		console.warn(err.message);
		// 	} else {
		// 		var collection = db.collection('users');
		// 		var stream = collection.find({name: uname}, {chats:1, _id:0}).stream();
		// 		var chat_mates = []
		// 		stream.on('data', function (chat) {
		// 			chat_mates = get_names(chat.chats,uname);
		// 			console.log(chat_mates);
		// 			socket.emit('get_chats',chat_mates);
		// 		});	
		// chat_mates = get_names(chat_mates, uname);				

		var stream = User.find({name: uname}, {chats:1 ,_id:0}).stream();
		var chat_mates = [];
		stream.on('data', function (chat) {
			chat_mates = get_names(chat.chats,uname);
			console.log(chat_mates);
			socket.emit('get_chats',chat_mates);
		});	
	});
});

function getChatName(a,b) {
	var sname = a > b ? a : b;
	var bname = a < b ? a : b;
	return sname + '_and_' + bname;
}

function get_names(a, name) {
	var c = [];
	for(i in a) {
		var b = a[i];
		b = b.replace(name,'');
		b = b.replace('_','');
		b = b.replace('and','');
		b = b.replace('_','');
		c.push(b);
	}
	return c;
}