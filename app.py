#!/usr/bin/env python3
"""Simple local server for dashboard + Alpaca live profit endpoint.

Edit API keys below OR set env vars:
- ALPACA_API_KEY
- ALPACA_API_SECRET
- ALPACA_BASE_URL (default paper)
"""

from __future__ import annotations

import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen

ALPACA_API_KEY = "allpaca_key = \"placeholder\""
ALPACA_API_SECRET = "allpaca_secret = \"placeholder\""
ALPACA_BASE_URL = "https://paper-api.alpaca.markets"


def _extract_value(line: str) -> str:
    if '="' in line:
        return line.split('="', 1)[1].rstrip('"')
    if '= "' in line:
        return line.split('= "', 1)[1].rstrip('"')
    return line


def _env_or_config(name: str, fallback: str) -> str:
    return os.getenv(name, _extract_value(fallback))


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

        super().do_GET()

    def handle_alpaca_profit(self):
        key = _env_or_config("ALPACA_API_KEY", ALPACA_API_KEY)
        secret = _env_or_config("ALPACA_API_SECRET", ALPACA_API_SECRET)
        base = os.getenv("ALPACA_BASE_URL", ALPACA_BASE_URL).rstrip("/")

        if "placeholder" in key.lower() or "placeholder" in secret.lower():
            self._send_json(
                {
                    "ok": False,
                    "error": "Set Alpaca keys in app.py or env vars (ALPACA_API_KEY/ALPACA_API_SECRET)",
                },
                400,
            )
            return

        try:
            req = Request(f"{base}/v2/account")
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
                    "mode": "live" if "api.alpaca.markets" in base and "paper" not in base else "paper",
                    "portfolio_value": equity,
                    "today_pl": today_pl,
                    "today_pl_pct": today_pl_pct,
                    "equity_change_pct": equity_change_pct,
                }
            )
        except Exception as exc:  # noqa: BLE001
            self._send_json({"ok": False, "error": str(exc)}, 502)


def run() -> None:
    port = int(os.getenv("PORT", "4173"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Serving dashboard + API at http://0.0.0.0:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
