import express from 'express';
import http from 'http';
import ip from 'ip';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const io = new Server(server, {
    cors: {
        origin: '*',
    }
})

app.use(cors())
app.get('/', (req, res) => {
    res.json('ip address: http://' + ip.address()+':'+PORT);    
});

let users = {};
let roomsData = {}; 


io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('setUsername', (username) => {
        users[socket.id] = username;
        console.log(`${username} connected`);
    });

    socket.on('createRoom', (username) => {
        socket.join(username);
        roomsData[username] = { creator: users[socket.id] }; // Store the creator in the room data
        console.log(`Room created: ${username}`);
        const rooms = Array.from(io.sockets.adapter.rooms.keys())
            .filter(room => roomsData[room]); 
        const roomsWithUserData = rooms.map((room, index) => ({ room: 'room ' + (index + 1), ...roomsData[room] })); 
        socket.emit('roomsList', roomsWithUserData);
    });

    socket.on('getRooms', () => {
        const rooms = Array.from(io.sockets.adapter.rooms.keys())
            .filter(room => roomsData[room]); 
        const roomsWithUserData = rooms.map((room, index) => ({ room: 'room ' + (index + 1), ...roomsData[room] })); 
        socket.emit('roomsList', roomsWithUserData);
    });
    
    
    socket.on('disconnect', () => {
        console.log(`${users[socket.id]} disconnected`);
        delete users[socket.id];
    });
    socket.on('message', (msg) => {
        console.log('message: ' + msg);
        io.emit('message', msg);
    });
    
    socket.on('room', (room, msg) => {
        console.log('room: ' + room + ' message: ' + msg);
        io.to(room).emit('message', msg);
    });

    socket.on('join', (room) => {
        console.log(`${users[socket.id]} join room: ` + room);
        socket.join(room);
        io.to(room).emit('join', `${users[socket.id]} has joined the room`);
    });

    socket.on('joinRoom', (room) => {
        socket.join(room);

        console.log(`${users[socket.id]} joined room: ${room}`);
    
        io.to(room).emit('userJoined', { user: users[socket.id], room });
    });

    socket.on('leave', (room) => {
        console.log(`${users[socket.id]} leave room: ` + room);
        socket.leave(room);
        io.to(room).emit('leave', `${users[socket.id]} has left the room`);
    });
})

server.listen(PORT, () => {
    console.log('Server ip : http://' +ip.address() +":" + PORT);
})