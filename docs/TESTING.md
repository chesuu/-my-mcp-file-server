# Testing and Verification

Install dependencies with `npm ci`, then run the automated tests with `npm test`.

```bash
npm ci
npm test
```

To run the demo, configure `.env` from `.env.example`, start the server, and run the client in a second terminal:

```bash
npm start
npm run demo
```

Record the actual test totals from the terminal output. The demo transcript should contain results from a real run, not invented examples. Never commit `.env` or tokens.