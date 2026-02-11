import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import Board from './Board';
import Modal from './Modal';
import Menu from './Menu';
import { checkWinner, checkDraw, getBestMove } from '../utils/gameLogic';

const socket = io('https://tic-tac-toe-mf6l.onrender.com', {
    autoConnect: false,
    transports: ['websocket'],  // Force WebSocket only, skip polling
    upgrade: false
});

const Game = () => {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState(true);
    const [winner, setWinner] = useState(null); // 'X', 'O', 'Draw'
    const [winningLine, setWinningLine] = useState([]);
    const [gameMode, setGameMode] = useState(null); // 'local', 'ai', 'online'
    const [difficulty, setDifficulty] = useState('easy');
    const [room, setRoom] = useState('');
    const [playerSymbol, setPlayerSymbol] = useState(null); // 'X' or 'O' for online
    const [isMyTurn, setIsMyTurn] = useState(true);
    const [turnMessage, setTurnMessage] = useState('');
    const [waitingForOpponent, setWaitingForOpponent] = useState(false);

    // Derived state for Modal
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (winner) {
            setShowModal(true);
        }
    }, [winner]);

    // Socket setup - all online game event listeners
    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connected to server');
        });

        // Server confirms room join with role assignment
        socket.on('room_joined', (data) => {
            const { room: roomID, symbol, waiting } = data;
            setRoom(roomID);
            setPlayerSymbol(symbol);
            setIsMyTurn(symbol === 'X');
            setWaitingForOpponent(waiting);
            console.log(`Joined room ${roomID} as ${symbol}, waiting: ${waiting}`);
        });

        // Both players notified when game can begin
        socket.on('game_start', (data) => {
            console.log('Game starting!', data);
            setWaitingForOpponent(false);
        });

        // Room is full
        socket.on('room_full', (roomID) => {
            alert(`Room ${roomID} is full!`);
            setGameMode(null);
        });

        // Server broadcasts validated moves to ALL players (including sender)
        socket.on('move_made', (data) => {
            const { index, player, board: serverBoard, currentTurn } = data;
            console.log(`Move received: ${player} -> cell ${index}`);

            // Use server board as source of truth
            setBoard([...serverBoard]);
            setIsXNext(currentTurn === 'X');

            // Check win/draw on the server board
            const winInfo = checkWinner(serverBoard);
            if (winInfo) {
                setWinner(winInfo.winner);
                setWinningLine(winInfo.line);
            } else if (checkDraw(serverBoard)) {
                setWinner('Draw');
            }
        });

        // Server broadcasts reset to ALL players
        socket.on('game_reset_ack', (data) => {
            const { board: serverBoard, currentTurn } = data;
            setBoard([...serverBoard]);
            setIsXNext(currentTurn === 'X');
            setWinner(null);
            setWinningLine([]);
            setShowModal(false);
        });

        socket.on('player_left', () => {
            alert('Opponent left the game');
            setGameMode(null);
            setWaitingForOpponent(false);
            resetGame(false, true);
        });

        return () => {
            socket.off('connect');
            socket.off('room_joined');
            socket.off('game_start');
            socket.off('room_full');
            socket.off('move_made');
            socket.off('game_reset_ack');
            socket.off('player_left');
        };
    }, []);

    // AI Logic
    useEffect(() => {
        if (gameMode === 'ai' && !isXNext && !winner) {
            // AI Turn (AI is O)
            const timer = setTimeout(() => {
                const moveIndex = getBestMove(board, difficulty);
                if (moveIndex !== -1 && moveIndex !== undefined) {
                    performMove(moveIndex, 'O');
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [board, isXNext, gameMode, winner, difficulty]);

    const performMove = (index, player) => {
        setBoard(prev => {
            const newBoard = [...prev];
            newBoard[index] = player;

            const winInfo = checkWinner(newBoard);
            if (winInfo) {
                setWinner(winInfo.winner);
                setWinningLine(winInfo.line);
            } else if (checkDraw(newBoard)) {
                setWinner('Draw');
            } else {
                setIsXNext(prevTurn => !prevTurn);
            }

            return newBoard;
        });

        if (gameMode === 'online' && player === playerSymbol) {
            setIsMyTurn(false);
        }
    };

    const handleCellClick = (index) => {
        if (board[index] || winner) return;

        if (gameMode === 'online') {
            if (waitingForOpponent) return;
            // Don't apply locally — just send to server.
            // Server validates and broadcasts back via 'move_made'.
            socket.emit('make_move', { room, index });
        } else if (gameMode === 'ai') {
            if (!isXNext) return; // Wait for AI
            performMove(index, 'X');
        } else {
            // Local
            performMove(index, isXNext ? 'X' : 'O');
        }
    };

    const joinRoomWhenReady = (roomCode) => {
        if (socket.connected) {
            socket.emit('join_room', roomCode);
        } else {
            socket.connect();
            socket.once('connect', () => {
                socket.emit('join_room', roomCode);
            });
        }
    };

    const handleStartGame = (mode, diff = 'easy') => {
        setDifficulty(diff);
        resetGame(false, true); // (emit, fullReset)

        if (mode === 'online-create' || mode === 'online-random') {
            const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
            joinRoomWhenReady(newRoom);
            setRoom(newRoom);
            // Symbol will be assigned by server via 'room_joined'
            setGameMode('online');
        } else {
            setGameMode(mode);
        }
    };

    const handleJoinGame = (inputRoom) => {
        if (!inputRoom) return;
        resetGame(false, true);
        joinRoomWhenReady(inputRoom.toUpperCase());
        setRoom(inputRoom.toUpperCase());
        // Symbol will be assigned by server via 'room_joined'
        setGameMode('online');
    };

    const resetGame = (emit = true, fullReset = false) => {
        setBoard(Array(9).fill(null));
        setIsXNext(true);
        setWinner(null);
        setWinningLine([]);
        setShowModal(false);

        if (fullReset) {
            setRoom('');
            setPlayerSymbol(null);
            setIsMyTurn(true);
            setWaitingForOpponent(false);
        } else if (gameMode === 'online') {
            // For online, tell server to reset — server will broadcast back via 'game_reset_ack'
            if (emit) socket.emit('game_reset', room);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-950 text-white p-4 font-sans">
            {!gameMode ? (
                <Menu onStartGame={handleStartGame} onJoinGame={handleJoinGame} />
            ) : (
                <>
                    <h1 className="text-4xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                        Tic Tac Toe
                    </h1>

                    <div className="flex justify-between w-full max-w-xs mb-6 text-xl font-semibold bg-gray-800 p-3 rounded-xl shadow-inner">
                        <div className={`px-4 py-2 rounded-lg transition-colors ${isXNext ? 'bg-blue-900 text-blue-300' : 'text-gray-500'}`}>
                            Player X
                        </div>
                        <div className={`px-4 py-2 rounded-lg transition-colors ${!isXNext ? 'bg-red-900 text-red-300' : 'text-gray-500'}`}>
                            Player O
                        </div>
                    </div>

                    {gameMode === 'online' && (
                        <div className="mb-6 bg-gray-800 px-6 py-3 rounded-lg border border-gray-700 flex flex-col items-center">
                            <span className="text-gray-400 text-sm mb-1">Room Code</span>
                            <span className="font-mono text-2xl font-bold text-yellow-400 tracking-wider select-all">{room}</span>
                            <span className="text-xs text-gray-500 mt-2">Share this code with your friend</span>
                        </div>
                    )}

                    {/* Waiting for opponent indicator */}
                    {gameMode === 'online' && waitingForOpponent && (
                        <div className="mb-4 text-lg animate-pulse text-yellow-300">
                            Waiting for opponent to join...
                        </div>
                    )}

                    {/* Turn Indicator for Online/AI */}
                    {(gameMode === 'online' || gameMode === 'ai') && !winner && !waitingForOpponent && (
                        <div className="mb-4 text-lg animate-pulse">
                            {gameMode === 'online'
                                ? (isXNext && playerSymbol === 'X') || (!isXNext && playerSymbol === 'O')
                                    ? "Your Turn"
                                    : "Opponent's Turn..."
                                : isMyTurn ? "Your Turn" : "Opponent's Turn..."
                            }
                        </div>
                    )}

                    <Board
                        board={board}
                        onCellClick={handleCellClick}
                        winningLine={winningLine}
                        isXNext={isXNext}
                        disabled={!!winner || (gameMode === 'online' && (waitingForOpponent || (isXNext ? playerSymbol !== 'X' : playerSymbol !== 'O'))) || (gameMode === 'ai' && !isXNext)}
                    />

                    <button
                        onClick={() => {
                            setGameMode(null);
                            // Disconnect socket if online?
                            if (gameMode === 'online') socket.disconnect();
                        }}
                        className="mt-10 text-gray-400 hover:text-white underline transition-colors"
                    >
                        Exit to Main Menu
                    </button>

                    <Modal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        title={winner === 'Draw' ? 'Game Draw!' : `Player ${winner} Wins!`}
                    >
                        <div className="flex flex-col gap-6 items-center">
                            <p className="text-xl text-gray-300">
                                {winner === 'Draw' ? 'It\'s a tie! Well played.' : `Stellar victory for Player ${winner}!`}
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => resetGame()}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105"
                                >
                                    Play Again
                                </button>
                                <button
                                    onClick={() => {
                                        setGameMode(null);
                                        if (gameMode === 'online') socket.disconnect();
                                    }}
                                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105"
                                >
                                    Menu
                                </button>
                            </div>
                        </div>
                    </Modal>
                </>
            )}
            <div className="fixed bottom-4 right-4 text-white font-bold text-sm opacity-50 hover:opacity-100 transition-opacity flex items-center gap-2">
                © Copyright 2026.
                <a
                    href="https://mail.google.com/mail/?view=cm&to=bhaskarshamoray11@gmail.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-transform hover:scale-105 no-underline"
                >
                    Er.Bsr
                </a>
            </div>
        </div>
    );
};

export default Game;
