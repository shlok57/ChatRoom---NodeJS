var socket = io();

$('#create_user').click(function () {
	$chatname = $('#chatname_box').val();
	$uname = $('#uname_box').val();
	socket.emit('chat_to', $chatname, $uname, function(data){
		if(data){
			$('.unameWrap').hide();
			$('.msgWrap').show();
		}
		else{
			$('#error').html('No such Username found...try again');
		}
	});
	$('#uname_box').val() = '';
	$('#chatname_box').val() = '';
});

$('#send-message-btn').click(function () {
	var msg = $('#message-box').val();
	var dt = new Date();
	socket.emit('chat_pri', msg, dt, $chatname);
	$('#messages').append(chat(msg,dt, $uname));
	$('#message-box').val('');
	var $target = $('html,body'); 
	$target.animate({scrollTop: $(document).height()}, 1000);
	return false;
});

socket.on('chat_pri', function (msg, date, uname) {
	var d = new Date(date);
	$('#messages').append(chat(msg,d, uname));
});

function chat(msg,dt, un){
	var c = $('<li class="other">');	
	c.append('<div class="msg">' + '<div class="user">' + un + '</div>' +'<p>' + msg + '</p>' + '<time>' + jQuery.timeago(dt) + '</time></div></li>');
	return c;
}