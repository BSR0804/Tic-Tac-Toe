const API_URL = 'https://tic-tac-toe-mf6l.onrender.com';

export const login = async (username, password) => {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    return data;
};

export const register = async (username, password) => {
    const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
};

export const getCurrentUser = () => {
    return localStorage.getItem('username');
};

// Mock Functions for Social/Phone Auth
export const mockSocialLogin = async (provider) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const mockUser = `${provider}_User_${Math.floor(Math.random() * 1000)}`;
            localStorage.setItem('token', `mock_token_${provider}`);
            localStorage.setItem('username', mockUser);
            resolve({ username: mockUser });
        }, 1000);
    });
};

export const sendMockOtp = async (phoneNumber) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`OTP for ${phoneNumber} is 123456`);
            resolve(true);
        }, 1000);
    });
};

export const verifyMockOtp = async (phoneNumber, otp) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (otp === '123456') {
                const mockUser = `Phone_User_${phoneNumber.slice(-4)}`;
                localStorage.setItem('token', `mock_token_phone`);
                localStorage.setItem('username', mockUser);
                resolve({ username: mockUser });
            } else {
                reject(new Error('Invalid OTP'));
            }
        }, 1000);
    });
};
