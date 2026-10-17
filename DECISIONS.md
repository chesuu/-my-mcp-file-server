# Decisions

- File tools operate only inside workspace/.
- HTTP requests require a Bearer token and an allowed Host header.
- Destructive actions require explicit flags.
- Git commands use fixed argument arrays.
- Local credentials belong in .env and must not be committed.
