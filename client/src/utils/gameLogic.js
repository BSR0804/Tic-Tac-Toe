export const checkWinner = (board) => {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
        [0, 4, 8], [2, 4, 6]             // diagonals
    ];

    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], line: lines[i] };
        }
    }
    return null;
};

export const checkDraw = (board) => {
    return board.every((cell) => cell !== null);
};

export const getBestMove = (board, difficulty) => {
    // Available moves
    const availableMoves = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);

    if (difficulty === 'easy') {
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    // Hard - Minimax
    const aiPlayer = 'O';
    const humanPlayer = 'X';

    const minimax = (currentBoard, depth, isMaximizing) => {
        const winState = checkWinner(currentBoard);
        if (winState?.winner === aiPlayer) return 10 - depth;
        if (winState?.winner === humanPlayer) return depth - 10;
        if (checkDraw(currentBoard)) return 0;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < currentBoard.length; i++) {
                if (currentBoard[i] === null) {
                    currentBoard[i] = aiPlayer;
                    const score = minimax(currentBoard, depth + 1, false);
                    currentBoard[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < currentBoard.length; i++) {
                if (currentBoard[i] === null) {
                    currentBoard[i] = humanPlayer;
                    const score = minimax(currentBoard, depth + 1, true);
                    currentBoard[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    };

    let bestScore = -Infinity;
    let move = -1;

    for (let i = 0; i < availableMoves.length; i++) {
        const index = availableMoves[i];
        board[index] = aiPlayer;
        const score = minimax(board, 0, false);
        board[index] = null;

        if (score > bestScore) {
            bestScore = score;
            move = index;
        }
    }

    return move;
};
