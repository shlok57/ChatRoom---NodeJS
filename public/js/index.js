var socket = io();

$(document).ready(function(){
	
});

$('#switch_chat-btn').click(function () {
	alert('yraah');
	// exports.index = function(req, res){
 //  		res.render('user', { title: 'User Chatroom' });
	// };
	socket.emit('switch_chat');  //switch to user.js ---to-do
});

$('#create_user').click(function () {
	$uname = $('#uname_box').val();
	socket.emit('new_user', $uname, function(data){
		if(data){
			$('.unameWrap').hide();
			$('.msgWrap').show();
		}
		else{
			$('#error').html('Username already taken...try again');
		}
	});
	$('#uname_box').val('');
	sessionStorage.setItem('uname', $uname);
});

$('#send-message-btn').click(function () {
	var msg = $('#message-box').val();
	var dt = new Date();
	socket.emit('chat', msg, dt, $uname);
	$('#messages').append(chat(msg,dt, $uname));
	$('#message-box').val('');	
	return false;
});

socket.on('chat', function (msg, date, uname) {
	var d = new Date(date);
	$('#messages').append(chat(msg,d, uname));
	var $target = $('html,body'); 
	$target.animate({scrollTop: $(document).height()}, 1000);
});

function chat(msg,dt, un){
	var c = $('<li class="other">');	
	c.append('<div class="msg">' + '<div class="user">' + un + '</div>' +'<p>' + msg + '</p>' + '<time>' + jQuery.timeago(dt) + '</time></div></li>');	
	return c;
}