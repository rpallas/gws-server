var http = require('http'), 
    io = require('socket.io'),
    UUID = require('node-uuid'),
    cookie = require('cookie'),
    secret = 'C4*gxJz^o%7!2@Dd*vX04Wf$AKr3T%30',
    parseCookies = require('connect').utils.parseSignedCookies,
    server = http.createServer(function(req, res){ 
        res.writeHead(200, {'Content-Type': 'text/json'}); 
        res.end('{ message: "Hello world" }'); 
    }).listen(process.env.PORT);

var sio = io.listen(server); 

sio.configure(function (){
    sio.set('log level', 3); // 0 - error, 1 - warn, 2 - info, 3 - debug    
    sio.set('authorization', function (handshakeData, callback) {
        // check if there's a cookie header
        // if (handshakeData.headers.cookie) {
        //     // if there is, parse the cookie
        //     handshakeData.cookie = parseCookies(cookie.parse(decodeURIComponent(handshakeData.headers.cookie)), secret);
        //     // note that you will need to use the same key to grad the session id, as you specified in the Express setup.
        //     handshakeData.sessionID = handshakeData.cookie['express.sid'];
        // } else {
        //     // if there isn't, turn down the connection with a message and leave the function.
        //     return callback('No cookie transmitted.', false);
        // }
        callback(null, true); // error first callback style 
    });
});

sio.on('connection', function(client){ 

    console.log('Client connected: ' + client.id);

    var myid = UUID.v4();
    client.userid = myid;
    // Send the id back to the client
    client.broadcast.emit('onconnected', {id:client.userid});

    client.on('message', function(data){
        data = JSON.parse(data);
        handleMessage(client, data.msg, data.data);
        console.log(data);
    });

    client.on('disconnect', function(){
        console.log('Disconnected: ' + client.id);
    });

});

var handleMessage = function(client, message, data){
      switch (message) {
          case "login":
              login(client, data);
              break;              
          case "findMatch":
              findRooms(client, data);
              break;
          case "quitMatch":
              quitMatch(client);
              break;
          default:
      }
};

var login = function(client, data){
    client.userName = data.userName;
    client.send("Logged in");
};

var quitMatch = function(client) {
    
};

var findRooms = function(client, data) {
    var rooms = sio.sockets.manager.rooms,
        selectedRoom = null,
        existingRoom = sio.sockets.manager.roomClients[client.id];
        
    // Break out early if the client is already in a room
    if(existingRoom['/'+client.userid]) {
        client.send("Already in a room");
        return;
    }
        
    // Find the first room with a space
    for(var room in rooms) {
        if (room !== '' && rooms[room].length === 1){
            selectedRoom = room.substring(1);   // Trim leading '/'                     
            break;            
        }
    }
    // Or create a new one
    if (selectedRoom === null) {
        client.join(client.userid);
        client.send("Created new room. Waiting for someone to join...");
    } else {
        var opponent = sio.sockets.clients(selectedRoom)[0];
        client.join(selectedRoom);
        client.send("Joined existing room: " + selectedRoom);
        var clientMsg = createMessage("begin", {opponent: {id:opponent.userid, userName:opponent.userName}}),
            opponentMsg = createMessage("begin", {opponent: {id:client.userid, userName:client.userName}});
        
        client.send(clientMsg);
        opponent.send(opponentMsg);        
    }
};

var createMessage = function(messageName, data){
    return JSON.stringify({
                msg: messageName,
                data: data
            });
};
