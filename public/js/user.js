var socket = io();

$(document).ready(function(){
	$uname = sessionStorage.getItem('uname');
	socket.emit('change_socket', $uname);
	socket.emit('get_chats', $uname);
	// alert($uname);
});

$('#create_user').click(function () {
	$chatname = $('#chatname_box').val();

	socket.emit('chat_to', $chatname, $uname, function(data){
		if(data){
			$('.unameWrap').hide();
			$('.msgWrap').show();
			alert(data);
		}
		else{
			$('#error').html('No such Username found...try again');
		}
	});
	$('#chatname_box').val('');
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

socket.on('get_chats', function(chat_mates) {
	alert(chat_mates);
	var $table = $('#chats');
	for (i in chat_mates) {
		var row = $('<tr><td>' + chat_mates[i] + '</td></tr>');
		$table.append(row);
	}
});