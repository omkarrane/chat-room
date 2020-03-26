const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const { addUser, removeUser, getUser, getUsersInRoom } = require('./services/user.service');

const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(require('./router'));

io.on('connection', (socket) => {
  console.log('user connected');

  socket.on('join', ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) callback(error);

    if (user) {
      socket.emit('message', { user: 'admin', text: `Welcome ${user.name} to room ${user.room}` });
      socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name}, has joined` });
      socket.join(user.room);
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

      callback();
    }
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    if (user) {
      io.to(user.room).emit('message', { user: user.name, text: message });
      callback();
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    const user = removeUser(socket.id);

    if(user) {
      io.to(user.room).emit('message', { user: 'admin', text: `${user.name}, has left` });
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
    }
  });
});

server.listen(PORT, () => console.log(`Server started on ${PORT}`));