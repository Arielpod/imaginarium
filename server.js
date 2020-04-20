const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, userLeave, getRoomUsers, setReadyForUser } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const serverName = 'SERVER';

// Run when client connect 
io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);
        
        socket.join(user.room);
        
        socket.emit('message', formatMessage(serverName, 'Welcome to The Game'));

        // Broadcast when user connect
        socket.broadcast.to(user.room).emit('message', formatMessage(serverName, `${user.username} joined The Game`));  
        
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });
    
    // Gdy użytkownik się odłącza - uwaga, może go wywalić z gry a będzie chciał powrócić!
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);
        
        if (user) {
            io.to(user.room).emit('message', formatMessage(serverName, `${user.username} has left The Game (but we dont know if he will return)`));

            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        } 
    });
    
    // Listen for chatMessages
    socket.on('chatMessage', (msg) => {
        const user = getCurrentUser(socket.id);
        
        io.to(user.room).emit('message', formatMessage(user.username, msg));
    });
    
    // Listen for game join
    socket.on('gameUserReady', (msg) => {
        const user = getCurrentUser(socket.id);
        const users = getRoomUsers(user.room);
        setReadyForUser(socket.id);
        
        
        console.log('START GAME BY'); 
        console.log(users); 
    });
});

const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
