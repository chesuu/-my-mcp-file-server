# Five-Minute Demo Guide

## 0:00-0:45 — Introduce the project
Explain that the app exposes a sandboxed workspace through MCP Streamable HTTP and uses a Bearer token to protect requests.

## 0:45-1:30 — Start the server
Run `npm install`, configure `.env`, and run `npm start`. Point out the local `/mcp` endpoint and the workspace path.

## 1:30-2:15 — Inspect the tools
Open MCP Inspector, choose Streamable HTTP, add the Authorization header, and call `list_files` and `read_file`.

## 2:15-3:30 — Show the handoff
Run `npm run demo`. Explain that Session 1 writes handoff notes, disconnects, and Session 2 reconnects and reads them.

## 3:30-4:15 — Show security checks
Demonstrate that an absolute path or a traversal path is rejected. Explain overwrite and delete confirmation flags.

## 4:15-5:00 — Tests and limitations
Run `npm test`, show Git status/diff, and state the limitations: shared token, no roles/rate limiting, and residual TOCTOU risk. For HTTPS, show ngrok forwarding to port 3000.
