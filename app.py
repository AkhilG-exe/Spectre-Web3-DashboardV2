#!/usr/bin/env python3
"""Serve dashboard + backend APIs.

Configuration comes from `.env` (if present) and/or environment variables.
"""

from __future__ import annotations

import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen


def load_dotenv(path: str = ".env") -> None:
    if not os.path.exists(path):
        return

    with open(path, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


load_dotenv()

ALPACA_BASE_URL = os.getenv("ALPACA_BASE_URL", "https://paper-api.alpaca.markets").rstrip("/")


class Handler(SimpleHTTPRequestHandler):
    def _send_json(self, data: dict, status: int = 200) -> None:
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path == "/api/alpaca/profit":
            self.handle_alpaca_profit()
            return
        if self.path == "/api/runtime-config":
            self.handle_runtime_config()
            return
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/groq/analyze":
            self.handle_groq_analyze()
            return
        if self.path == "/api/render/deploy":
            self.handle_render_deploy()
            return

        self._send_json({"ok": False, "error": "Not found"}, 404)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length > 0 else b"{}"
        return json.loads(raw.decode("utf-8"))

    def handle_runtime_config(self):
        self._send_json({"ok": True, "dashboard_pin": os.getenv("DASHBOARD_PIN", "052809")})

    def handle_alpaca_profit(self):
        key = os.getenv("ALPACA_API_KEY", "")
        secret = os.getenv("ALPACA_API_SECRET", "")

        if not key or not secret:
            self._send_json(
                {
                    "ok": False,
                    "error": "Set ALPACA_API_KEY and ALPACA_API_SECRET in .env",
                },
                400,
            )
            return

        try:
            req = Request(f"{ALPACA_BASE_URL}/v2/account")
            req.add_header("APCA-API-KEY-ID", key)
            req.add_header("APCA-API-SECRET-KEY", secret)

            with urlopen(req, timeout=10) as resp:
                account = json.loads(resp.read().decode("utf-8"))

            equity = float(account.get("equity", 0))
            last_equity = float(account.get("last_equity", 0))
            today_pl = equity - last_equity
            today_pl_pct = (today_pl / last_equity * 100) if last_equity else 0
            equity_change_pct = float(account.get("equity_change_percent", 0)) * 100

            self._send_json(
                {
                    "ok": True,
                    "mode": "live" if "paper" not in ALPACA_BASE_URL else "paper",
                    "portfolio_value": equity,
                    "today_pl": today_pl,
                    "today_pl_pct": today_pl_pct,
                    "equity_change_pct": equity_change_pct,
                }
            )
        except Exception as exc:  # noqa: BLE001
            self._send_json({"ok": False, "error": str(exc)}, 502)

    def handle_groq_analyze(self):
        groq_key = os.getenv("GROQ_API_KEY", "")
        body = self._read_json()
        prompt = body.get("prompt", "")

        if not groq_key:
            self._send_json({"ok": False, "error": "Set GROQ_API_KEY in .env"}, 400)
            return

        try:
            req = Request("https://api.groq.com/openai/v1/chat/completions", method="POST")
            req.add_header("Content-Type", "application/json")
            req.add_header("Authorization", f"Bearer {groq_key}")
            payload = json.dumps(
                {
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a concise trading analyst. Provide entry, invalidation, and risk guidance in <= 5 bullets.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                }
            ).encode("utf-8")

            with urlopen(req, data=payload, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            content = data.get("choices", [{}])[0].get("message", {}).get("content", "No analysis returned.")
            self._send_json({"ok": True, "content": content})
        except Exception as exc:  # noqa: BLE001
            self._send_json({"ok": False, "error": str(exc)}, 502)

    def handle_render_deploy(self):
        render_key = os.getenv("RENDER_API_KEY", "")
        body = self._read_json()

        if not render_key:
            self._send_json({"ok": False, "error": "Set RENDER_API_KEY in .env"}, 400)
            return

        self._send_json(
            {
                "ok": True,
                "message": "Deploy request accepted (simulation).",
                "botName": body.get("botName", "Unknown Bot"),
                "renderUrl": body.get("renderUrl", ""),
            }
        )


def run() -> None:
    port = int(os.getenv("PORT", "4173"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Serving dashboard + API at http://0.0.0.0:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
