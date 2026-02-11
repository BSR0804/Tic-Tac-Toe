import React from 'react';
import { motion } from 'framer-motion';

const Cell = ({ value, onClick, isWinningCell, disabled }) => {
    return (
        <button
            className={`
        h-20 w-20 sm:h-24 sm:w-24 text-4xl sm:text-6xl font-bold flex items-center justify-center rounded-lg shadow-lg transition-transform transform active:scale-95
        ${value === 'X' ? 'text-blue-400 bg-gray-800' : value === 'O' ? 'text-red-400 bg-gray-800' : 'bg-gray-700 hover:bg-gray-600'}
        ${isWinningCell ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
        ${disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}
      `}
            onClick={onClick}
            disabled={disabled}
        >
            {value && (
                <motion.span
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                    {value}
                </motion.span>
            )}
        </button>
    );
};

export default Cell;
