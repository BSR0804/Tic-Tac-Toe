@echo off
echo Starting Tic-Tac-Toe...

cd server
if not exist node_modules (
    echo Installing Server Dependencies...
    call npm install
)
start "Tic-Tac-Toe Server" npm start

cd ..\client
if not exist node_modules (
    echo Installing Client Dependencies...
    call npm install
)
start "Tic-Tac-Toe Client" npm run dev

echo Game started! Check the opened windows.
pause
