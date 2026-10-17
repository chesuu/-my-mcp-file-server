# Student MCP File-Server Connector Report

## Overview
This project demonstrates a Model Context Protocol (MCP) file-server connector for a controlled coursework workspace. It exposes file operations over Streamable HTTP and includes Git status/diff tools.

## Design
The Express server validates the request host and requires a shared Bearer token. MCP tools are registered separately from the HTTP server. File operations resolve paths against a configured workspace and reject absolute paths, traversal attempts, and symlinks that lead outside the sandbox. File reads and writes have a 1 MB limit. Overwrites and deletes require explicit confirmation flags.

## Tool set
The server provides list_files, read_file, write_file, str_replace, delete_file, search_files, git_status, and git_diff. Git is invoked with fixed arguments through Node's child-process API rather than a shell command string.

## Session handoff
The demo uses two independent MCP client connections. The first writes persistent project notes; the second reads those notes and continues the task. This illustrates how state stored in workspace files can persist beyond an individual client connection.

## Limitations
The project uses a shared token rather than OAuth and does not implement roles or rate limiting. Symlink checks reduce risk but cannot eliminate all time-of-check/time-of-use races. The project is intended for classroom demonstrations, not production use.

## Validation
Run `npm install` and `npm test` locally. The report does not claim that tests have passed until they have been executed in the target environment.
