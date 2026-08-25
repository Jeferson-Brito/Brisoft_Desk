@echo off
title Brisoft Desk - Backend & WhatsApp Server
echo ========================================================
echo   BRISOFT DESK - INICIANDO SERVIDOR & WHATSAPP
echo ========================================================
echo.

set "PATH=%USERPROFILE%\git\cmd;%USERPROFILE%\nodejs;%PATH%"

cd /d "%~dp0server"
if not exist node_modules (
  echo Instalando dependencias do servidor...
  call npm install
)

echo Iniciando servidor na porta 3000...
node src/server.js
pause
