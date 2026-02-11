import React from 'react';
import Cell from './Cell';

const Board = ({ board, onCellClick, winningLine, isXNext, disabled }) => {
    return (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 p-4 bg-gray-900 rounded-xl shadow-2xl border border-gray-700">
            {board.map((cell, index) => (
                <Cell
                    key={index}
                    value={cell}
                    onClick={() => onCellClick(index)}
                    isWinningCell={winningLine?.includes(index)}
                    disabled={disabled || cell !== null}
                />
            ))}
        </div>
    );
};

export default Board;
