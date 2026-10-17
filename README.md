# Student MCP File-Server Connector

A starter project for the Week 6 “Build Your Own” MCP file-server connector assignment. It provides file-management tools through MCP Streamable HTTP, protects HTTP requests with a Bearer token, includes lightweight Git tools, and demonstrates saved notes between separate client sessions.

## Features

- **Eight MCP tools:** `list_files`, `read_file`, `write_file`, `str_replace`, `delete_file`, `search_files`, `git_status`, and `git_diff`.
- **Workspace isolation:** Blocks absolute paths and attempts to leave the workspace with `..` paths. Checks symlinks and hard-linked files to reduce the chance of accessing files outside the sandbox.
- **Guarded file changes:** Replacing an existing file requires `overwrite=true`. Text replacement must identify exactly one match, and deleting a file requires `confirm=true`. Directory deletion is not supported.
- **Protected HTTP endpoint:** Uses Bearer-token authentication, a Host allowlist, a maximum JSON request size, and a basic health-check route.
- **Two-session handoff demo:** The demo script creates two separate MCP client connections, creates and reads a workspace note, searches files, and checks Git status and the diff.
- **Saved project state:** Includes `workspace/PROJECT_STATE.md`, `workspace/PLAN_LOG.md`, `workspace/CHECKPOINTS.md`, and `workspace/DECISIONS.md`.
- **Submission materials:** Includes a short project report and a guide for a five-minute demonstration.

## Requirements

- Node.js 20 or later
- npm
- Git installed and available from the command line
- ngrok or another HTTPS tunnel for the remote-access demonstration
- PM2 for optional process management

## 1. Install and configure

Open a terminal in the project directory and install the dependencies:

```bash
npm ci
```

Make a local copy of the environment template.

**Windows PowerShell**
```powershell
Copy-Item .env.example .env
```

**Windows Command Prompt**
```bat
copy .env.example .env
```

**macOS/Linux**
```bash
cp .env.example .env
```

Create a secure random token:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Put the generated value in `.env` as `MCP_AUTH_TOKEN`. Do not use a sample placeholder or commit your `.env` file.

By default, the server listens on `127.0.0.1:3000`, and the sandbox is the project's `workspace/` directory.

## 2. Start the server and run tests

In Terminal 1, start the server:

```bash
npm start
```

The expected local endpoint is:

```text
http://127.0.0.1:3000/mcp
```

Keep the server running. In Terminal 2, run the test suite:

```bash
npm test
```

Initialize Git in the sample workspace when needed:

```bash
npm run git:init
```

If Git reports that the workspace is already a repository, it has already been initialized.

### Inspect the tools with MCP Inspector

Run:

```bash
npm run inspector
```

Open the URL printed by Inspector, choose a Streamable HTTP connection, and enter:

```text
http://127.0.0.1:3000/mcp
```

Add this request header:

- **Header:** `Authorization`
- **Value:** `Bearer <your MCP_AUTH_TOKEN>`

Use the token value saved in your local `.env` file. Try `list_files`, `read_file`, and `search_files`.

## 3. Demonstrate the two-session handoff

Leave the server running in Terminal 1, then run the demo in Terminal 2:

```bash
npm run demo
```

The script sends MCP requests to the running HTTP endpoint. Client Session 1 lists the workspace, writes a demo note, and reads it back. Client Session 2 connects separately, searches for the note's text, and checks Git status and the diff.

After the demo, `docs/DEMO_TRANSCRIPT.md` is generated with the actual tool calls and responses from that run.

The two connections show that saved project state can be reused across separate MCP client sessions. If the assignment specifically requires two separate AI-agent conversations, repeat the handoff using two instructor-approved AI-client conversations as well.

The demo writes `DEMO_NOTE.md` inside the sample workspace. Back up `workspace/` before running the demo if you want to preserve its original contents.

## 4. Expose the endpoint over HTTPS

The app does not handle public TLS by itself. For the remote demo, use an HTTPS tunnel that forwards traffic to `127.0.0.1:3000`.

Start the local server, then open another terminal and run:

```bash
npx ngrok http 3000
```

Ngrok may require an account and authentication setup. Copy the HTTPS hostname it provides, for example `example-name.ngrok-free.app`.

Add that hostname to `MCP_ALLOWED_HOSTS` in `.env`, separated from the other allowed hosts by commas:

```dotenv
MCP_ALLOWED_HOSTS=localhost,127.0.0.1,localhost:3000,127.0.0.1:3000,example-name.ngrok-free.app
```

Restart the server so it reads the updated settings, and keep the tunnel process running. Connect the MCP client to:

```text
https://example-name.ngrok-free.app/mcp
```

Use the same `Authorization: Bearer <token>` header. If the tunnel hostname changes, update the allowlist again. Do not use `*` as the allowlist or expose the service with a weak token.

## 5. Optional process management with PM2

PM2 can keep the local server process running and is useful for demonstrating process supervision.

Install PM2:

```bash
npm install -g pm2
```

Start and inspect the server:

```bash
pm2 start server.js --name student-mcp-file-server
pm2 status
pm2 logs student-mcp-file-server
```

Stop it with:

```bash
pm2 stop student-mcp-file-server
```

The HTTPS tunnel is a separate process and must remain active too. For a five-minute class presentation, showing the server and tunnel in two terminals is usually enough.

## MCP tools

| Tool | What it does | Main safeguard |
| --- | --- | --- |
| `list_files` | Lists workspace files and directories | Relative paths; skips `.git` and dependencies |
| `read_file` | Reads UTF-8 text files | 1 MB limit; rejects binary files |
| `write_file` | Creates or overwrites a text file | Existing files need `overwrite=true`; 1 MB limit |
| `str_replace` | Replaces a specific text segment | Requires exactly one match |
| `delete_file` | Removes a file | Requires `confirm=true`; blocks directories |
| `search_files` | Searches text files without case sensitivity | Skips large, binary, and ignored files; limits results |
| `git_status` | Displays repository status | Runs Git with fixed arguments, not a shell command |
| `git_diff` | Displays unstaged changes | Validates an optional file path against the workspace |

## Project structure

```text
.
├── server.js                MCP HTTP server
├── package.json             Scripts and dependencies
├── package-lock.json        Dependency lockfile
├── .env.example             Local configuration template
├── demo.js                  Two-session handoff demo
├── test.js                  Automated workspace safety tests
├── docs/                    Report, architecture, testing, demo guide, transcript
└── workspace/               Sandbox and saved notes
```

## Documentation

- [Project report](docs/PROJECT_REPORT.md)
- [Five-minute demo guide](docs/DEMO_GUIDE.md)
- [Architecture overview](docs/ARCHITECTURE.md)
- [Testing and verification](docs/TESTING.md)
- [Demo transcript](docs/DEMO_TRANSCRIPT.md), generated after a successful live demo
- The sandbox and any handoff notes are stored under `workspace/`.
- [MIT License](LICENSE)
- GitHub Actions runs the Node.js test suite on pushes and pull requests.

## Security notes

This project is intended for coursework and controlled demonstrations, not for use as a production file service. It relies on a shared static Bearer token instead of OAuth and does not include user roles or rate limiting. Use it only with a trusted demo setup and an HTTPS tunnel.

Do not configure the workspace to your home directory, a repository containing credentials, or any folder with private files that should not be read or changed by an AI tool. Path checks reduce the risk of leaving the workspace, but they cannot fully prevent time-of-check/time-of-use issues if another local process changes symlinks during an operation.

## License

See the repository's license file for usage terms.
