import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import Board from './Board';
import Modal from './Modal';
import Menu from './Menu';
import { checkWinner, checkDraw, getBestMove } from '../utils/gameLogic';

const socket = io('http://localhost:3001', {
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

    // Derived state for Modal
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (winner) {
            setShowModal(true);
        }
    }, [winner]);

    // Socket setup
    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connected to server');
        });

        socket.on('room_joined', (roomID) => {
            setRoom(roomID);
            // If we just joined, we are O. If we created, we set X elsewhere (in handleStartGame)
            // Actually simpler: 
            // Creator emits join_room -> gets room_joined. 
            // Joiner emits join_room -> gets room_joined.
            // We need to distinguish.
            // Let's rely on local state 'playerSymbol' set during interaction.
        });

        socket.on('player_left', () => {
            alert('Opponent left the game');
            setGameMode(null);
            resetGame();
        });

        return () => {
            socket.off('connect');
            socket.off('room_joined');
            socket.off('player_left');
        };
    }, []);

    // Remote Move Listener - needs access to current board/state or use functional updates
    useEffect(() => {
        const handleRemoteMove = (data) => {
            const { index, player } = data;

            setBoard(prev => {
                const newBoard = [...prev];
                newBoard[index] = player;

                // Check win/draw immediately on the new board
                const winInfo = checkWinner(newBoard);
                if (winInfo) {
                    setWinner(winInfo.winner);
                    setWinningLine(winInfo.line);
                } else if (checkDraw(newBoard)) {
                    setWinner('Draw');
                }

                return newBoard;
            });

            setIsXNext(prev => !prev);
            setIsMyTurn(true); // Remote moved, now it's my turn
        };

        const handleRemoteReset = () => {
            resetGame(false);
        };

        socket.on('receive_move', handleRemoteMove);
        socket.on('receive_reset', handleRemoteReset);

        return () => {
            socket.off('receive_move', handleRemoteMove);
            socket.off('receive_reset', handleRemoteReset);
        };
    }, []); // Dependencies? Empty because functional updates used.

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
            if (!isMyTurn) return;
            // Socket emit
            const currentPlayer = playerSymbol; // Should match isXNext logic: X starts
            // Validation:
            if ((isXNext && playerSymbol !== 'X') || (!isXNext && playerSymbol !== 'O')) return;

            performMove(index, playerSymbol);
            socket.emit('make_move', { room, index, player: playerSymbol });
        } else if (gameMode === 'ai') {
            if (!isXNext) return; // Wait for AI
            performMove(index, 'X');
        } else {
            // Local
            performMove(index, isXNext ? 'X' : 'O');
        }
    };

    const handleStartGame = (mode, diff = 'easy') => {
        setDifficulty(diff);
        resetGame(false, true); // (emit, fullReset)

        if (mode === 'online-create' || mode === 'online-random') {
            const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
            if (!socket.connected) socket.connect();
            socket.emit('join_room', newRoom);
            setRoom(newRoom);
            setPlayerSymbol('X');
            setIsMyTurn(true);
            setGameMode('online');
        } else {
            setGameMode(mode);
        }
    };

    const handleJoinGame = (inputRoom) => {
        if (!inputRoom) return;
        resetGame(false, true);
        if (!socket.connected) socket.connect();
        socket.emit('join_room', inputRoom.toUpperCase());
        setRoom(inputRoom.toUpperCase());
        setPlayerSymbol('O');
        setIsMyTurn(false); // X goes first
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
        } else if (gameMode === 'online') {
            // Just clearing board
            setIsMyTurn(playerSymbol === 'X');
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

                    {/* Turn Indicator for Online/AI */}
                    {(gameMode === 'online' || gameMode === 'ai') && !winner && (
                        <div className="mb-4 text-lg animate-pulse">
                            {isMyTurn ? "Your Turn" : "Opponent's Turn..."}
                        </div>
                    )}

                    <Board
                        board={board}
                        onCellClick={handleCellClick}
                        winningLine={winningLine}
                        isXNext={isXNext}
                        disabled={!!winner || (gameMode === 'online' && !isMyTurn) || (gameMode === 'ai' && !isXNext)}
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
            <div className="fixed bottom-4 right-4 text-white font-bold text-sm opacity-50 hover:opacity-100 transition-opacity">
                Bhaskar Shamo Ray
            </div>
        </div>
    );
};

export default Game;
