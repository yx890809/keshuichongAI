import sys
import json
import xml.etree.ElementTree as ET
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    try:
        import urllib.request as urllib2
    except ImportError:
        import urllib2

class ProxyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        
        if 'url' not in query_params:
            self.wfile.write(b'{"error": "Missing url parameter"}')
            return
        
        target_url = query_params['url'][0]
        
        try:
            data = self.fetch_data(target_url)
            
            if target_url.lower().endswith('.xml'):
                xml_data = self.parse_xml(data.decode('utf-8'))
                self.wfile.write(json.dumps(xml_data).encode('utf-8'))
            else:
                self.wfile.write(data)
                
        except Exception as e:
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
    
    def fetch_data(self, url):
        if HAS_REQUESTS:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Connection': 'keep-alive',
                'Referer': url
            }
            response = requests.get(url, headers=headers, timeout=30, verify=False)
            return response.content
        else:
            import ssl
            context = ssl._create_unverified_context()
            req = urllib2.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'identity',
                'Connection': 'keep-alive',
                'Referer': url
            })
            response = urllib2.urlopen(req, timeout=30, context=context)
            return response.read()
    
    def parse_xml(self, xml_text):
        try:
            root = ET.fromstring(xml_text)
            result = []
            for row in root.findall('.//row'):
                item = {}
                for child in row:
                    item[child.tag] = child.text
                for attr, value in row.items():
                    item[attr] = value
                result.append(item)
            return result
        except Exception as e:
            return {'error': 'XML parse failed: ' + str(e)}
    
    def log_message(self, format, *args):
        print("[Proxy] %s - %s" % (self.address_string(), format % args))

def main():
    server_address = ('127.0.0.1', 8888)
    httpd = HTTPServer(server_address, ProxyHandler)
    print("=" * 50)
    print("Proxy server started")
    print("Address: http://127.0.0.1:8888")
    print("Usage: http://127.0.0.1:8888/?url=target_api_url")
    print("=" * 50)
    httpd.serve_forever()

if __name__ == '__main__':
    main()