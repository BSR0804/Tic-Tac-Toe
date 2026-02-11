import React, { useState, useEffect } from 'react';
import { FaGlobe, FaUsers, FaHandshake, FaRobot, FaUserCircle, FaSignOutAlt, FaGamepad } from 'react-icons/fa';
import { MdPhoneIphone } from 'react-icons/md';
import AuthModal from './AuthModal';
import { getCurrentUser, logout } from '../utils/auth';

const Menu = ({ onStartGame, onJoinGame }) => {
    const [roomInput, setRoomInput] = useState('');
    const [menuState, setMenuState] = useState('main'); // 'main', 'friends', 'ai'
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [user, setUser] = useState(getCurrentUser());

    const isLoggedIn = !!user;

    const handleLoginSuccess = (username) => {
        localStorage.setItem('username', username);
        setUser(username);
        setIsAuthOpen(false);
    };

    const handleLogout = () => {
        logout();
        setUser(null);
    };

    const renderMainMenu = () => (
        <div className="flex flex-col gap-4 w-full max-w-sm">
            <button
                onClick={() => onStartGame('online-random')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-3"
            >
                <FaGlobe className="text-xl" /> Online <span className="text-xs font-normal opacity-75">(coming soon)</span>
            </button>

            <button
                onClick={() => alert("Team Up mode coming soon!")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-3 opacity-80"
            >
                <FaUsers className="text-xl" /> Team Up <span className="text-xs font-normal opacity-75">(Coming Soon)</span>
            </button>

            <button
                onClick={() => setMenuState('friends')}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-3"
            >
                <FaHandshake className="text-xl" /> Friends
            </button>

            <button
                onClick={() => setMenuState('ai')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-3"
            >
                <FaRobot className="text-xl" /> vs AI
            </button>

            <button
                onClick={() => onStartGame('local')}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-3"
            >
                <MdPhoneIphone className="text-xl" /> Pass and Play
            </button>
        </div>
    );

    const renderFriendsMenu = () => (
        <div className="flex flex-col gap-4 w-full max-w-sm bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-gray-300 mb-2">Play with Friends</h3>

            <button
                onClick={() => onStartGame('online-create')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg mb-2 transition-colors"
            >
                Create Private Room
            </button>

            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Enter Room ID"
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <button
                    onClick={() => onJoinGame(roomInput)}
                    disabled={!roomInput.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                    Join
                </button>
            </div>

            <button
                onClick={() => setMenuState('main')}
                className="mt-4 text-gray-400 hover:text-white underline transition-colors"
            >
                Back to Menu
            </button>
        </div>
    );

    const renderAiMenu = () => (
        <div className="flex flex-col gap-4 w-full max-w-sm bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-gray-300 mb-2">Select Difficulty</h3>

            <button
                onClick={() => onStartGame('ai', 'easy')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-105"
            >
                Easy
            </button>

            <button
                onClick={() => onStartGame('ai', 'hard')}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-105"
            >
                Hard
            </button>

            <button
                onClick={() => setMenuState('main')}
                className="mt-4 text-gray-400 hover:text-white underline transition-colors"
            >
                Back to Menu
            </button>
        </div>
    );

    // If user is NOT logged in, show login screen
    if (!isLoggedIn) {
        return (
            <div className="flex flex-col gap-8 text-center items-center w-full">
                <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mb-4 drop-shadow-lg mt-12">
                    Tic-Tac-Toe
                </h1>

                <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                    <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-8 w-full backdrop-blur-sm">
                        <FaGamepad className="text-5xl text-purple-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Sign In to Play</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            Login or create an account to start playing Tic-Tac-Toe with friends online!
                        </p>
                        <button
                            onClick={() => setIsAuthOpen(true)}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-105 text-lg"
                        >
                            Login / Register
                        </button>
                    </div>
                </div>

                <AuthModal
                    isOpen={isAuthOpen}
                    onClose={() => setIsAuthOpen(false)}
                    onLoginSuccess={handleLoginSuccess}
                />
            </div>
        );
    }

    // User IS logged in — show the game menu
    return (
        <div className="flex flex-col gap-4 text-center items-center w-full">
            {/* User Profile - fixed top right of screen */}
            <div className="fixed top-2 right-2 z-40">
                <div className="flex items-center gap-3 bg-gray-800/90 p-2 rounded-full px-4 border border-gray-700 shadow-lg backdrop-blur-sm">
                    <span className="text-white font-semibold flex items-center gap-2 text-sm">
                        <FaUserCircle className="text-lg text-blue-400" />
                        {user}
                    </span>
                    <button
                        onClick={handleLogout}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                        title="Logout"
                    >
                        <FaSignOutAlt />
                    </button>
                </div>
            </div>

            <h1 className="text-5xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mb-4 drop-shadow-lg">
                Tic-Tac-Toe
            </h1>

            {menuState === 'main' && renderMainMenu()}
            {menuState === 'friends' && renderFriendsMenu()}
            {menuState === 'ai' && renderAiMenu()}

            <AuthModal
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
                onLoginSuccess={handleLoginSuccess}
            />
        </div>
    );
};

export default Menu;

