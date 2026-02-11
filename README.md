# 🎮 Tic-Tac-Toe - Full Stack Multiplayer Game

A modern, feature-rich Tic-Tac-Toe application built with **React** and **Node.js**, featuring real-time multiplayer capabilities, AI opponents, and secure authentication.

## ✨ Key Features

### 🔐 Authentication & Users
- **Secure Sign Up & Login**: Creates user accounts with hashed passwords (bcrypt) and JWT-based session management.
- **Social Login**: Integrated Google and Facebook authentication flows.
- **Profile System**: Tracks logged-in users.

### 🕹️ Game Modes
1.  **Pass & Play**: Classic local multiplayer on a single device.
2.  **Play vs AI**: 
    - **Easy Mode**: Good for casual play.
    - **Hard Mode**: Uses the Minimax algorithm for an unbeatable challenge.
3.  **Play with Friends (Real-Time)**:
    - Create private game rooms.
    - innovative room code system to invite friends.
    - Powered by **Socket.io** for instant move synchronization.

### 🎨 UI/UX Design
- **Responsive Interface**: Fully optimized for mobile and desktop devices.
- **Modern Aesthetics**: Built with **Tailwind CSS**, featuring glassmorphism effects, smooth gradients, and **Framer Motion** animations.
- **Interactive Feedback**: Sound effects (optional) and visual cues for game states (win/draw).

## 🛠️ Technology Stack

### Frontend (Client)
- **React.js** (Vite)
- **Tailwind CSS** (Styling)
- **Framer Motion** (Animations)
- **Socket.io-client** (Real-time communication)
- **React-OAuth/Google** (Authentication)

### Backend (Server)
- **Node.js & Express**
- **Socket.io** (WebSocket server)
- **SQLite3** (Lightweight relational database)
- **Bcrypt & JWT** (Security)

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/BSR0804/Tic-Tac-Toe.git
    cd Tic-Tac-Toe
    ```

2.  **Setup the Server**
    ```bash
    cd server
    npm install
    # Start the backend server (default port 3001)
    npm start
    ```

3.  **Setup the Client**
    Open a new terminal window/tab:
    ```bash
    cd client
    npm install
    # Start the frontend application (default port 5173)
    npm run dev
    ```

4.  **Play!**
    Open your browser and navigate to `http://localhost:5173` to start playing.

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repository and submit a pull request.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
