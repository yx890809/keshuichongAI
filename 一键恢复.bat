@echo off
chcp 65001 >nul
echo ========================================
echo     瞌睡虫V5 一键恢复工具
echo ========================================
echo.
echo 正在启动版本恢复程序...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0restore.ps1"
pause