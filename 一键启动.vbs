Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "d:\AA趋势分析"

' 启动代理服务器（后台运行，不显示窗口）
WshShell.Run "python proxy_server.py", 0, False
WScript.Sleep 1000

' 启动HTTP服务器（显示窗口）
WshShell.Run "python start_server.py", 1, False
WScript.Sleep 2000

' 打开浏览器
WshShell.Run "http://localhost:8000"