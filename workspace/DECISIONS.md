# Decisions

- Use MCP Streamable HTTP for the remote/client demonstration.
- Restrict file operations to the configured workspace directory.
- Require explicit flags before overwriting or deleting files.
- Use fixed Git command arguments rather than invoking a shell.
- Keep the demo token in the local .env file, which must not be committed.
