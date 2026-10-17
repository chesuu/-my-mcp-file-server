# Architecture

- `server.js` starts the Express HTTP server and configures MCP Streamable HTTP.
- `lib/` contains the workspace path helpers and MCP tool registration.
- `src/` contains task utilities.
- `scripts/` contains the demonstration client.
- `test/` contains automated tests.
- `docs/` contains the report, demo instructions, architecture notes, and transcript.
- `workspace/` contains example project state and handoff notes.

Requests are checked by the HTTP middleware before MCP tools run. File operations are restricted to the configured workspace. See `PROJECT_REPORT.md` for the design summary.