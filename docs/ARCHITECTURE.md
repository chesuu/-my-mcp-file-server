# Architecture

- `server.js` contains the workspace safety functions, all eight MCP tool registrations, HTTP authentication, and the Streamable HTTP server.
- `demo.js` runs two separate MCP client sessions and writes a real transcript after a successful run.
- `test.js` contains the automated workspace safety tests.
- `package.json` defines the project scripts and dependencies.
- `docs/` contains the project report, architecture notes, testing guide, demo guide, and transcript.
- `workspace/` is the sandbox used by the server and contains example handoff notes.

Requests pass through the HTTP middleware before MCP tools run. File operations are restricted to the configured workspace. The code is intentionally consolidated into three JavaScript files to keep the project easy to review.