import http.server
import socketserver
import urllib.parse
import json
import sys

PORT = 8000

try:
    import requests
except ImportError:
    print("请先安装requests库: pip install requests")
    sys.exit(1)

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        print(f"收到请求: {self.path}")
        if '/proxy?' in self.path:
            idx = self.path.find('/proxy?')
            query_string = self.path[idx + 7:]
            params = urllib.parse.parse_qs(query_string)
            if 'url' in params:
                target_url = params['url'][0]
                print(f"请求目标: {target_url}")
                try:
                    response = requests.get(target_url, headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/json, text/plain, */*'
                    }, timeout=10)
                    
                    print(f"响应状态: {response.status_code}")
                    
                    self.send_response(response.status_code)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                    self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                    self.send_header('Content-Type', response.headers.get('Content-Type', 'text/plain'))
                    self.end_headers()
                    self.wfile.write(response.content)
                    
                except Exception as e:
                    print(f"错误: {str(e)}")
                    error = json.dumps({'error': str(e)}).encode('utf-8')
                    self.send_response(500)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(error)
            else:
                print("缺少url参数")
                self.send_response(400)
                self.end_headers()
        else:
            super().do_GET()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
        print(f"服务已启动，端口 {PORT}")
        print(f"访问 http://localhost:{PORT}")
        httpd.serve_forever()