var socket = io();
var uname = ""

$(document).ready(function(){
	uname = prompt("Enter Your Name");
});

$('#send-message-btn').click(function () {
	var msg = $('#message-box').val();
	var dt = new Date();
	socket.emit('chat', msg, dt, uname);
	$('#messages').append(chat(msg,dt, uname));
	$('#message-box').val('');
	var $target = $('html,body'); 
	$target.animate({scrollTop: $(document).height()}, 1000);
	return false;
});
socket.on('chat', function (msg, date, uname) {
	var d = new Date(date);
	$('#messages').append(chat(msg,d, uname));
});

function chat(msg,dt, un){
	var c = $('<li class="other">');	
	c.append('<div class="msg">' + '<div class="user">' + un + '</div>' +'<p>' + msg + '</p>' + '<time>' + jQuery.timeago(dt) + '</time></div></li>');
	return c;
}