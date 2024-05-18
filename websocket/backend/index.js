const express = require('express');
const http = require('http');
// const socketIo = require('socket.io');
const ip = require('ip');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const io = new Server(server, {
    cors: {
        origin: '*',
    }
})

app.use(cors())
// Serve static files from the "frontend" directory
app.use(express.static(path.join(__dirname, '../front')));

// Route to serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/index.html'));
});

let users = {};
let roomsData = {}; 
const roomUserCount = {};

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('setUsername', (username) => {
        users[socket.id] = username;
        console.log(`${username} connected`);
    });

    socket.on('createRoom', (roomName) => {
        socket.join(roomName);
        roomsData[roomName] = { creator: users[socket.id] }; // Store the creator in the room data
        console.log(`Room created: ${roomName}`);
        const rooms = Array.from(io.sockets.adapter.rooms.keys())
            .filter(room => roomsData[room]); 
        const roomsWithUserData = rooms.map(room => ({ room, ...roomsData[room] })); 
        socket.emit('roomsList', roomsWithUserData);

        updateRoomStatus();

    });
    
    socket.on('getRooms', () => {
        const rooms = Array.from(io.sockets.adapter.rooms.keys())
            .filter(room => roomsData[room]); 
        const roomsWithUserData = rooms.map(room => ({
            room,
            ...roomsData[room],
            isFull: roomUserCount[room] >= 2 
        })); 
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
        if (roomUserCount[room] && roomUserCount[room] >= 2) {
            socket.emit('roomFull');
        } else {
            socket.join(room);
            if (!roomUserCount[room]) {
                roomUserCount[room] = 0;
            }
            roomUserCount[room]++; 
            socket.join(room);

            console.log(`${users[socket.id]} joined room: ${room}`);
        
            io.to(room).emit('userJoined', { user: users[socket.id], room });

            //quand il y a 2 joueurs dans la room
            if (roomUserCount[room] === 2) {
                io.to(room).emit('roomIsFull'); 
            }
            
            socket.on('joinRoom', (room) => {
                if (roomUserCount[room] === 2) {
                    socket.emit('roomFullAndCannotJoin');
                    socket.leave(room);
                }
            });
        }
    });


    socket.on('gameStarted', (room) => {
        io.to(room).emit('gameStarted');
    });

    socket.on('leave', (room) => {
        socket.leave(room);
        roomUserCount[room]--;

        console.log(`${users[socket.id]} leave room: ` + room);
        socket.leave(room);
        console.log(`${users[socket.id]} has left ${room}`);
        io.to(room).emit('leave', { user: users[socket.id], room: room });
        updateRoomStatus();
    });

    //le statut de la room
    function updateRoomStatus() {
        const rooms = Array.from(io.sockets.adapter.rooms.keys())
            .filter(room => roomsData[room]); 
        const roomsWithUserData = rooms.map(room => ({
            room,
            ...roomsData[room],
            isFull: roomUserCount[room] >= 2 
        })); 
        io.emit('roomsList', roomsWithUserData); 
    }
})

server.listen(PORT, () => {
    console.log('Server ip : http://' +ip.address() +":" + PORT);
})