@echo off
chcp 65001 >nul
cd /d "d:\AA趋势分析"

echo 正在启动代理服务器...
start /min python proxy_server.py

timeout /t 1 /nobreak >nul

echo 正在启动HTTP服务器...
python start_server.py