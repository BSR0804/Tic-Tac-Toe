const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Tic-Tac-Toe Server is running' });
});

// Database Setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating table', err.message);
            }
        });
    }
});

const SECRET_KEY = "supersecretkey"; // In production, use environment variable

// Auth Endpoints
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword], function (err) {
            if (err) {
                return res.status(400).json({ error: "Username already exists" });
            }
            res.json({ message: "Registration successful" });
        });
    } catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: "Server error" });
        if (!user) return res.status(400).json({ error: "User not found" });

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
            res.json({ token, username: user.username });
        } else {
            res.status(400).json({ error: "Invalid credentials" });
        }
    });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const rooms = new Map();
const disconnectTimers = new Map(); // Track grace period timers for disconnected players

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);

        if (!rooms.has(room)) {
            // First player creates the room
            rooms.set(room, {
                players: [socket.id],
                board: Array(9).fill(null),
                currentTurn: 'X',
                roles: { [socket.id]: 'X' },
                symbolToSocket: { 'X': socket.id, 'O': null },
                gameActive: true
            });
            socket.emit('room_joined', { room, symbol: 'X', waiting: true });
            console.log(`Room ${room} created by ${socket.id} as X`);
        } else {
            const roomData = rooms.get(room);
            if (roomData.players.length >= 2) {
                socket.emit('room_full', room);
                return;
            }
            roomData.players.push(socket.id);
            roomData.roles[socket.id] = 'O';
            roomData.symbolToSocket['O'] = socket.id;
            socket.emit('room_joined', { room, symbol: 'O', waiting: false });
            console.log(`${socket.id} joined room ${room} as O`);

            // Notify both players the game can start
            io.to(room).emit('game_start', {
                room,
                board: roomData.board,
                currentTurn: roomData.currentTurn
            });
        }
    });

    // Handle reconnection: player re-joins with their original symbol
    socket.on('rejoin_room', (data) => {
        const { room, symbol } = data;
        console.log(`Rejoin request: ${socket.id} wants to rejoin room ${room} as ${symbol}`);

        if (!rooms.has(room)) {
            // Room was lost (server restart etc.) - recreate it
            rooms.set(room, {
                players: [socket.id],
                board: Array(9).fill(null),
                currentTurn: 'X',
                roles: { [socket.id]: symbol },
                symbolToSocket: { [symbol]: socket.id },
                gameActive: true
            });
            socket.join(room);
            socket.emit('rejoin_ack', {
                room,
                symbol,
                board: Array(9).fill(null),
                currentTurn: 'X',
                opponentPresent: false
            });
            console.log(`Room ${room} recreated for rejoining ${socket.id} as ${symbol}`);
            return;
        }

        const roomData = rooms.get(room);

        // Cancel any pending disconnect timer for this symbol
        const timerKey = `${room}_${symbol}`;
        if (disconnectTimers.has(timerKey)) {
            clearTimeout(disconnectTimers.get(timerKey));
            disconnectTimers.delete(timerKey);
            console.log(`Cancelled disconnect timer for ${symbol} in room ${room}`);
        }

        // Remove old socket.id for this symbol if it exists
        const oldSocketId = roomData.symbolToSocket[symbol];
        if (oldSocketId && oldSocketId !== socket.id) {
            roomData.players = roomData.players.filter(id => id !== oldSocketId);
            delete roomData.roles[oldSocketId];
        }

        // Add new socket.id
        if (!roomData.players.includes(socket.id)) {
            roomData.players.push(socket.id);
        }
        roomData.roles[socket.id] = symbol;
        roomData.symbolToSocket[symbol] = socket.id;

        socket.join(room);

        // Send full state sync to the rejoining player
        socket.emit('rejoin_ack', {
            room,
            symbol,
            board: roomData.board,
            currentTurn: roomData.currentTurn,
            opponentPresent: roomData.players.length >= 2
        });

        // If both players are now present, notify game_start
        if (roomData.players.length >= 2) {
            io.to(room).emit('game_start', {
                room,
                board: roomData.board,
                currentTurn: roomData.currentTurn
            });
        }

        console.log(`${socket.id} rejoined room ${room} as ${symbol}. Players: ${roomData.players.length}`);
    });

    socket.on('make_move', (data) => {
        // data: { room, index }
        const roomData = rooms.get(data.room);
        if (!roomData) return;
        if (!roomData.gameActive) return;

        const playerSymbol = roomData.roles[socket.id];
        if (!playerSymbol) return; // Not a player in this room

        // Validate it's this player's turn
        if (roomData.currentTurn !== playerSymbol) {
            console.log(`Not ${socket.id}'s turn. Current turn: ${roomData.currentTurn}`);
            return;
        }

        // Validate the cell is empty
        if (roomData.board[data.index] != null) {
            console.log(`Cell ${data.index} already occupied`);
            return;
        }

        // Apply move on server
        roomData.board[data.index] = playerSymbol;
        roomData.currentTurn = playerSymbol === 'X' ? 'O' : 'X';

        // Broadcast the validated move to ALL players in the room
        io.to(data.room).emit('move_made', {
            index: data.index,
            player: playerSymbol,
            board: roomData.board,
            currentTurn: roomData.currentTurn
        });

        console.log(`Move in ${data.room}: ${playerSymbol} -> cell ${data.index}`);
    });

    socket.on('game_reset', (room) => {
        const roomData = rooms.get(room);
        if (!roomData) return;

        // Reset the board on server
        roomData.board = Array(9).fill(null);
        roomData.currentTurn = 'X';
        roomData.gameActive = true;

        // Broadcast reset to ALL players in room
        io.to(room).emit('game_reset_ack', {
            board: roomData.board,
            currentTurn: roomData.currentTurn
        });
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
        rooms.forEach((roomData, key) => {
            if (roomData.players.includes(socket.id)) {
                const symbol = roomData.roles[socket.id];

                // Remove from active players
                roomData.players = roomData.players.filter(id => id !== socket.id);
                delete roomData.roles[socket.id];

                if (roomData.players.length === 0) {
                    // Both disconnected — give a grace period before deleting
                    const timerKey = `${key}_${symbol}`;
                    disconnectTimers.set(timerKey, setTimeout(() => {
                        // Check if still empty
                        const rd = rooms.get(key);
                        if (rd && rd.players.length === 0) {
                            rooms.delete(key);
                            console.log(`Room ${key} deleted after grace period (empty)`);
                        }
                        disconnectTimers.delete(timerKey);
                    }, 30000)); // 30 second grace period for reconnection
                } else {
                    // Other player still connected — give grace period before notifying
                    const timerKey = `${key}_${symbol}`;
                    disconnectTimers.set(timerKey, setTimeout(() => {
                        // Check if the player actually reconnected
                        const rd = rooms.get(key);
                        if (rd && !rd.symbolToSocket[symbol] || rd.symbolToSocket[symbol] === socket.id) {
                            // Player didn't reconnect — notify the other player
                            const otherSocket = rd.players[0];
                            if (otherSocket) {
                                io.to(otherSocket).emit('player_left');
                            }
                            // Clean up the room
                            delete rd.symbolToSocket[symbol];
                        }
                        disconnectTimers.delete(timerKey);
                    }, 15000)); // 15 second grace period
                }
            }
        });
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
