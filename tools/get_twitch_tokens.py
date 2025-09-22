#!/usr/bin/env python3
# tools/get_twitch_tokens.py
# Twitch OAuth (Authorization Code Flow) helper for chat bots.
# Prompts: Client ID, Client Secret, Redirect URI. Opens Dev Console first (optional).

import os, sys, json, time, urllib.parse, urllib.request, webbrowser, shutil
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread

SCOPES = ["chat:read", "chat:edit"]
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.env")
AUTH_URL = "https://id.twitch.tv/oauth2/authorize"
TOKEN_URL = "https://id.twitch.tv/oauth2/token"
DEFAULT_REDIRECT = "http://localhost:8000/oauth/callback"

def parse_env(path: str) -> dict:
    env = {}
    if not os.path.exists(path):
        return env
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env

def write_env(path: str, values: dict):
    existing = parse_env(path)
    existing.update(values)
    # Keep a stable order: sort keys for readability
    lines = [f"{k}={existing[k]}" for k in sorted(existing.keys())]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

def safe_open_url(url: str):
    ok = webbrowser.open(url, new=1, autoraise=True)
    if ok:
        return True
    # Fallbacks for Windows and others
    try:
        if os.name == "nt":
            os.system(f'start "" "{url}"')
            return True
        # xdg-open or open (macOS)
        opener = shutil.which("xdg-open") or shutil.which("open")
        if opener:
            import subprocess
            subprocess.run([opener, url], check=False)
            return True
    except Exception:
        pass
    return False

class CodeCatcher(BaseHTTPRequestHandler):
    got = {"code": None, "error": None}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)

        # Ignore favicon (and any noise without code/error)
        if parsed.path.endswith("/favicon.ico") or ("code" not in qs and "error" not in qs):
            self.send_response(204); self.end_headers()
            return

        if "error" in qs:
            self.__class__.got["error"] = qs.get("error", [None])[0]
        elif "code" in qs:
            self.__class__.got["code"] = qs.get("code", [None])[0]

        self.send_response(200); self.end_headers()
        self.wfile.write(b"<h1>OAuth complete</h1>You can close this tab.")

        if self.__class__.got["code"]:
            print("\n=== Authorization code captured ===")
            print(self.__class__.got["code"])
            print("===================================\n")
            # Stop the server ASAP to prevent overwrite by follow-up requests
            Thread(target=self.server.shutdown, daemon=True).start()

    def log_message(self, format, *args):
        return


def run_local_server(port: int = 8000, timeout: int = 180):
    httpd = HTTPServer(("localhost", port), CodeCatcher)
    t = Thread(target=httpd.serve_forever, daemon=True); t.start()
    start = time.time()
    try:
        while time.time() - start < timeout:
            if CodeCatcher.got["code"] or CodeCatcher.got["error"]:
                break
            time.sleep(0.05)
    finally:
        httpd.shutdown()
    return CodeCatcher.got

def prompt(msg: str, default: str = "") -> str:
    if default:
        val = input(f"{msg} [{default}]: ").strip()
        return val or default
    return input(f"{msg}: ").strip()

def main():
    print("=== Twitch OAuth Helper (Guided) ===")

    # Allow prefill from existing env
    env = parse_env(ENV_PATH)
    pre_id = env.get("TWITCH_CLIENT_ID", "")
    pre_redirect = env.get("TWITCH_REDIRECT_URI", DEFAULT_REDIRECT)

    client_id = prompt("Application ID (Client ID)", pre_id)
    client_secret = prompt("Client Secret")
    redirect_uri = prompt("Redirect URI", pre_redirect)

    if not client_id or not client_secret or not redirect_uri:
        print("All fields are required.")
        sys.exit(1)

    # Build and open authorization URL
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
    }
    url = AUTH_URL + "?" + urllib.parse.urlencode(params)
    print("\nOpen this URL if your browser does not launch automatically:")
    print(url + "\n")
    safe_open_url(url)

    # Capture code if localhost redirect
    if redirect_uri.startswith("http://localhost:"):
        port = urllib.parse.urlparse(redirect_uri).port or 8000
        print(f"Waiting for Twitch to redirect back to localhost:{port} ...")
        got = run_local_server(port=port)
        if got["error"]:
            print("OAuth error:", got["error"]); sys.exit(2)
        code = got["code"]
    else:
        print("After authorizing, Twitch will redirect to your Redirect URI.")
        print("Copy the 'code' parameter from that URL and paste it below.")
        code = input("Authorization code: ").strip()

    if not code:
        print("No authorization code received.")
        sys.exit(3)

    print(f"\n[INFO] Using authorization code: {code}\n")

    # Exchange for tokens
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(TOKEN_URL, data=body, headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req) as resp:
            token_data = json.loads(resp.read().decode())
    except Exception as e:
        print("Token exchange failed:", e)
        sys.exit(4)

    access = token_data.get("access_token")
    refresh = token_data.get("refresh_token")
    if not access:
        print("Error: no access_token in response", token_data)
        sys.exit(5)

    oauth_for_chat = access if str(access).startswith("oauth:") else f"oauth:{access}"
    updates = {
        "TWITCH_CLIENT_ID": client_id,
        "TWITCH_CLIENT_SECRET": client_secret,
        "TWITCH_REDIRECT_URI": redirect_uri,
        "TWITCH_OAUTH": oauth_for_chat,
    }
    if refresh:
        updates["TWITCH_REFRESH"] = refresh

    write_env(ENV_PATH, updates)
    print("\nTokens saved to config.env")
    print("  - TWITCH_OAUTH (access token)")
    if refresh:
        print("  - TWITCH_REFRESH (refresh token)")
    print("\nDone.")

if __name__ == "__main__":
    main()
