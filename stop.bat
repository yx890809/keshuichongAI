@echo off
chcp 65001 >nul
title Stop Lottery Server

echo ====================
echo 停止 Lottery Server
echo ====================

echo.
echo 正在停止所有 Node.js 进程...
taskkill /f /im node.exe 2>nul

echo.
echo 所有 Node.js 进程已停止
echo.

pause