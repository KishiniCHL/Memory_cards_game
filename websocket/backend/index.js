const express = require('express');
const http = require('http');
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
let cardValues = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']; // Paires de valeurs de cartes
let players = []; // Liste des joueurs
let currentPlayerIndex = 0; // Index du joueur actuel
let pairCounts = {};

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('setUsername', (username) => {
        users[socket.id] = username;
        console.log(`${username} connected`);
        socket.emit('usernameSet', username);
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

            io.to(room).emit('playerJoinedRoom');

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

    // Envoyer cardValues au client lorsqu'il se connecte
    socket.emit('cardValues', cardValues);

    socket.on('gameStarted', (room) => {
        cardValues.sort(() => Math.random() - 0.5); // Mélanger les valeurs de cartes
        io.to(room).emit('gameStarted', cardValues);
    });

    // événement 'cardFlipped'
    socket.on('cardFlipped', ({ index, room }) => {
        // Émettre un événement à tous les autres joueurs dans la même salle
        socket.broadcast.to(room).emit('cardFlipped', { index });
    });

    socket.on('pairFound', ({ player, indices, room }) => {
        if (!pairCounts[room]) {
            pairCounts[room] = { player1: 0, player2: 0 };
        }
        
        // Increase the pair counter for the player
        pairCounts[room][player]++;
        console.log(`${player} found a pair. Total pairs: ${pairCounts[room][player]}`);
    
        // Check if the player has found all pairs
        if (pairCounts[room][player] === cardValues.length / 2) {
            console.log(`${player} has found all pairs and won the game!`);
            io.to(room).emit('gameOver', { winner: player });
        }
    
        // Emit the pairFound event to all other players in the same room
        socket.broadcast.to(room).emit('pairFound', { player, indices });
    });
    
    // The event handler for when the cards do not match
    socket.on('cardsDoNotMatch', ({ indices, room }) => {
        // Emit an event to all other players in the same room
        socket.broadcast.to(room).emit('cardsDoNotMatch', { indices });
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