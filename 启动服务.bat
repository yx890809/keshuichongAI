@echo off
chcp 65001 >nul
title 瞌睡虫V5趋势分析 - 后端服务

echo ========================================
echo   瞌睡虫V5趋势分析 - 后端服务
echo ========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/3] 检查依赖...
if not exist "node_modules" (
    echo 正在安装依赖，请稍候...
    npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

echo [2/3] 检查数据目录...
if not exist "D:\lottery_data" (
    echo 正在创建数据目录: D:\lottery_data
    mkdir "D:\lottery_data"
    if %errorlevel% neq 0 (
        echo [警告] 无法创建数据目录，请手动创建
        echo        手动创建: D:\lottery_data
    )
)

echo [3/3] 启动后端服务...
echo.
echo ========================================
echo   数据目录: D:\lottery_data
echo   服务地址: http://localhost:3000
echo ========================================
echo.
echo 提示: 在浏览器中打开 http://localhost:3000
echo       关闭此窗口将停止服务
echo.

node server.js
