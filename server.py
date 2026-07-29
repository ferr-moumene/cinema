import http.server
import socketserver
import json
import urllib.request
import urllib.error
import hashlib
import os
import secrets

PORT = 8080
CHARGILY_SECRET_KEY = os.environ.get("CHARGILY_SECRET_KEY")
CHARGILY_API_URL = os.environ.get("CHARGILY_API_URL", "https://pay.chargily.net/test/api/v2/checkouts")

ADMIN_USER = "admin"
ADMIN_PASSWORD = os.environ.get("CINEMA_ADMIN_PASSWORD", "")
ADMIN_PASS_HASH = hashlib.sha256(ADMIN_PASSWORD.encode('utf-8')).hexdigest() if ADMIN_PASSWORD else None

class CinemaServerHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        # 1. SECURE SERVER-SIDE AUTHENTICATION ENDPOINT
        if self.path == '/api/login' or self.path == '/login.php':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
            except Exception:
                data = {}

            user = data.get('username', '').strip()
            password = data.get('password', '').strip()
            
            # Hash incoming password for server-side verification
            input_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()

            if ADMIN_PASS_HASH and user == ADMIN_USER and secrets.compare_digest(input_hash, ADMIN_PASS_HASH):
                token = secrets.token_urlsafe(32)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "success",
                    "role": "admin",
                    "token": token,
                    "message": "Authenticated successfully as Administrator"
                }).encode('utf-8'))
            else:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "error",
                    "message": "Invalid username or password"
                }).encode('utf-8'))

        # 2. CHARGILY PAY CHECKOUT ENDPOINT
        elif self.path == '/api/create-checkout' or self.path == '/create_checkout.php':
            if not CHARGILY_SECRET_KEY:
                self.send_response(503)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "error",
                    "message": "Payment service is not configured on this server"
                }).encode('utf-8'))
                return
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
            except Exception:
                data = {}

            amount = data.get('amount', 2800)
            currency = data.get('currency', 'dzd')
            email = data.get('email', 'alex@cosmos.com')
            movie = data.get('movie', 'Cinema Cosmos Ticket')

            payload = {
                "amount": amount,
                "currency": currency.lower(),
                "success_url": "http://127.0.0.1:8080/index.html#thank-you",
                "failure_url": "http://127.0.0.1:8080/index.html#payment",
                "metadata": {
                    "email": email,
                    "movie": movie,
                    "app": "Cinema Cosmos"
                }
            }

            req = urllib.request.Request(
                CHARGILY_API_URL,
                data=json.dumps(payload).encode('utf-8'),
                headers={
                    "Authorization": f"Bearer {CHARGILY_SECRET_KEY}",
                    "Content-Type": "application/json",
                    "User-Agent": "CinemaCosmos/1.0"
                }
            )

            try:
                with urllib.request.urlopen(req) as response:
                    res_body = response.read().decode('utf-8')
                    res_json = json.loads(res_body)
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "status": "success",
                        "checkout_url": res_json.get("checkout_url"),
                        "checkout_id": res_json.get("id")
                    }).encode('utf-8'))
            except urllib.error.HTTPError as e:
                err_body = e.read().decode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "error",
                    "message": f"Chargily Error {e.code}",
                    "details": err_body
                }).encode('utf-8'))
            except Exception as ex:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "error",
                    "message": str(ex)
                }).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), CinemaServerHandler) as httpd:
        print(f"Cinema Cosmos Secure Server running at http://127.0.0.1:{PORT}")
        httpd.serve_forever()
