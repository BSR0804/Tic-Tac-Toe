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

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);

        // Manage room state
        if (!rooms.has(room)) {
            rooms.set(room, { count: 1, players: [socket.id], board: Array(9).fill(null), isXNext: true });
        } else {
            const roomData = rooms.get(room);
            roomData.count++;
            roomData.players.push(socket.id);
            rooms.set(room, roomData);
        }

        // Notify user of success/role? For now just ack
        socket.emit('room_joined', room);
    });

    socket.on('make_move', (data) => {
        // data: { room, index, player }
        // Broadcast move to other players in room
        socket.to(data.room).emit('receive_move', data);
    });

    socket.on('game_reset', (room) => {
        socket.to(room).emit('receive_reset');
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
        rooms.forEach((value, key) => {
            if (value.players.includes(socket.id)) {
                value.players = value.players.filter(id => id !== socket.id);
                value.count--;
                if (value.count === 0) {
                    rooms.delete(key);
                } else {
                    socket.to(key).emit('player_left');
                }
            }
        });
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
