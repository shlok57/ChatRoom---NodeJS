var socket = io();
$('#send-message-btn').click(function () {
	var msg = $('#message-box').val();
	var dt = new Date();
	socket.emit('chat', msg, dt);
	$('#messages').append(chat(msg,dt));
	$('#message-box').val('');
	var $target = $('html,body'); 
	$target.animate({scrollTop: $target.height()}, 1000);
	return false;
});
socket.on('chat', function (msg, date) {
	var d = new Date(date);
	$('#messages').append(chat(msg,d));
});

function chat(msg,dt){
	var c = $('<li class="other">');	
	c.append('<div class="msg">' + '<p>' + msg + '</p>' + '<time>' + jQuery.timeago(dt) + '</time></div></li>');
	return c;
}