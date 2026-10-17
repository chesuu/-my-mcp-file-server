# Student MCP File-Server Connector Report

## Overview
This project demonstrates a Model Context Protocol (MCP) file-server connector for a controlled coursework workspace. It exposes file operations over MCP Streamable HTTP and includes Git status and diff tools.

## Design
The Express server validates the request Host header and requires a shared Bearer token. MCP tools are registered separately from the HTTP server. File operations resolve paths against a configured workspace and reject absolute paths, traversal attempts, and symlinks that lead outside the sandbox. File reads and writes have a 1 MB limit. Overwrites and deletes require explicit confirmation flags.

## Tool set
The server provides eight tools: `list_files`, `read_file`, `write_file`, `str_replace`, `delete_file`, `search_files`, `git_status`, and `git_diff`. Git is invoked with fixed arguments through Node's child-process API rather than a shell command string.

## Session handoff
The demo uses two independent MCP client connections. The first writes persistent project notes; the second reads those notes and continues the task. This illustrates how state stored in workspace files can persist beyond an individual client connection.

## Security considerations
The shared token is a simple coursework authentication method, not OAuth. The project does not implement roles or rate limiting. Symlink checks reduce risk but cannot eliminate all time-of-check/time-of-use races. This project is intended for classroom demonstrations, not production deployment.

## Validation
Install dependencies with `npm ci` and run `npm test`. Do not claim that tests pass until they have actually been executed in the target environment.
