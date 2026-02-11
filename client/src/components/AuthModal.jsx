import React, { useState } from 'react';
import { login, register, mockSocialLogin, sendMockOtp, verifyMockOtp } from '../utils/auth';
import { FaGoogle, FaFacebook, FaPhoneAlt } from 'react-icons/fa';
import { useGoogleLogin } from '@react-oauth/google';

const AuthModal = ({ isOpen, onClose, onLoginSuccess }) => {
    const [view, setView] = useState('login'); // 'login', 'register', 'phone', 'otp'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                }).then(res => res.json());

                // In a real app, you would send this token/info to your backend to create a session
                // For now, we'll just use the name from Google
                onLoginSuccess(userInfo.name || userInfo.email);
                onClose();
            } catch (err) {
                setError('Failed to get user info from Google');
            }
        },
        onError: () => setError('Google Login Failed'),
    });

    if (!isOpen) return null;

    const resetForm = () => {
        setUsername('');
        setPassword('');
        setPhoneNumber('');
        setOtp('');
        setError('');
        setMessage('');
    };

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        try {
            if (view === 'login') {
                const data = await login(username, password);
                onLoginSuccess(data.username);
                onClose();
            } else {
                await register(username, password);
                setMessage('Registration successful! Please login.');
                setView('login');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSocialLogin = async (provider) => {
        if (provider === 'Google') {
            googleLogin();
            return;
        }

        try {
            const data = await mockSocialLogin(provider);
            onLoginSuccess(data.username);
            onClose();
        } catch (err) {
            setError(`${provider} login failed`);
        }
    };

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await sendMockOtp(phoneNumber);
            setView('otp');
            setMessage(`OTP sent to ${phoneNumber} (Use 123456)`);
        } catch (err) {
            setError('Failed to send OTP');
        }
    };

    const handleOtpVerify = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const data = await verifyMockOtp(phoneNumber, otp);
            onLoginSuccess(data.username);
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    const renderTitle = () => {
        switch (view) {
            case 'register': return 'Create Account';
            case 'phone': return 'Phone Login';
            case 'otp': return 'Verify OTP';
            default: return 'Welcome Back';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white"
                >
                    ✕
                </button>

                <h2 className="text-3xl font-bold text-white mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    {renderTitle()}
                </h2>

                {error && <div className="bg-red-900/50 text-red-200 p-3 rounded-lg mb-4 text-sm border border-red-700">{error}</div>}
                {message && <div className="bg-green-900/50 text-green-200 p-3 rounded-lg mb-4 text-sm border border-green-700">{message}</div>}

                {(view === 'login' || view === 'register') && (
                    <>
                        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                required
                            />
                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors mt-2 shadow-lg"
                            >
                                {view === 'login' ? 'Login' : 'Register'}
                            </button>
                        </form>

                        <div className="flex items-center my-6">
                            <div className="flex-1 border-t border-gray-600"></div>
                            <span className="px-4 text-gray-500 text-sm">OR</span>
                            <div className="flex-1 border-t border-gray-600"></div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => handleSocialLogin('Google')}
                                className="w-full bg-white text-gray-900 font-semibold py-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <FaGoogle className="text-red-600" /> Continue with Google
                            </button>
                            <button
                                onClick={() => handleSocialLogin('Facebook')}
                                className="w-full bg-[#1877F2] text-white font-semibold py-3 rounded-lg hover:bg-[#166fe5] transition-colors flex items-center justify-center gap-2"
                            >
                                <FaFacebook className="text-white" /> Continue with Facebook
                            </button>
                            <button
                                onClick={() => { setView('phone'); resetForm(); }}
                                className="w-full bg-gray-700 text-white font-semibold py-3 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <FaPhoneAlt className="text-green-400" /> Continue with Phone
                            </button>
                        </div>
                    </>
                )}

                {view === 'phone' && (
                    <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
                        <input
                            type="tel"
                            placeholder="Phone Number (e.g., +1234567890)"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            required
                        />
                        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg mt-2">
                            Get OTP
                        </button>
                        <button onClick={() => setView('login')} className="text-gray-400 hover:text-white text-sm mt-2">
                            Back to Login
                        </button>
                    </form>
                )}

                {view === 'otp' && (
                    <form onSubmit={handleOtpVerify} className="flex flex-col gap-4">
                        <div className="text-center text-gray-300 mb-2">
                            Enter OTP sent to {phoneNumber}
                        </div>
                        <input
                            type="text"
                            placeholder="OTP Code"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="p-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-center tracking-widest text-xl focus:outline-none focus:border-blue-500"
                            required
                        />
                        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg mt-2">
                            Verify & Login
                        </button>
                        <button onClick={() => setView('phone')} className="text-gray-400 hover:text-white text-sm mt-2">
                            Change Phone Number
                        </button>
                    </form>
                )}

                {view === 'login' && (
                    <div className="mt-6 text-center text-gray-400 text-sm">
                        Don't have an account? <button onClick={() => setView('register')} className="text-blue-400 hover:underline">Create one</button>
                    </div>
                )}
                {view === 'register' && (
                    <div className="mt-6 text-center text-gray-400 text-sm">
                        Already have an account? <button onClick={() => setView('login')} className="text-blue-400 hover:underline">Login</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthModal;
