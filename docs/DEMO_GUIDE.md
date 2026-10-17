# Five-Minute Demo Guide

## 0:00–0:45 — Introduce the project
Explain that the app exposes a sandboxed workspace through MCP Streamable HTTP and uses a Bearer token to protect requests.

## 0:45–1:30 — Start the server
Run `npm ci`, copy `.env.example` to `.env`, set a strong `MCP_AUTH_TOKEN`, then run `npm start`. Point out the local `/mcp` endpoint and the workspace path.

## 1:30–2:15 — Inspect the tools
Open MCP Inspector, choose Streamable HTTP, and connect to `http://127.0.0.1:3000/mcp`. Configure the required Authorization header if the Inspector version supports custom headers, then call `list_files` and `read_file`.

## 2:15–3:30 — Show the handoff
Run `npm run demo`. Explain that Session 1 creates and reads a workspace demo note, disconnects, and Session 2 reconnects to search the workspace and check Git status. The transcript file is only evidence after a successful live run.

## 3:30–4:15 — Show security checks
Demonstrate that an absolute path or traversal path is rejected. Explain overwrite and delete confirmation flags.

## 4:15–5:00 — Tests and limitations
Run `npm test`, show Git status/diff, and state the limitations: shared token, no roles/rate limiting, and residual TOCTOU risk. For HTTPS testing, show the ngrok tunnel forwarding to port 3000. Do not expose the token in screenshots.
