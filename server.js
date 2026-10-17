import "dotenv/config";
import express from "express";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getWorkspaceRoot } from "./lib/workspace.js";
import { registerTools } from "./lib/tools.js";

const app = express();
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const token = process.env.MCP_AUTH_TOKEN || "";
const allowedHosts = new Set((process.env.MCP_ALLOWED_HOSTS || "localhost,127.0.0.1,localhost:3000,127.0.0.1:3000").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
const workspaceRoot = getWorkspaceRoot();
const maxBytes = Number(process.env.MAX_REQUEST_BYTES || 1048576);

if (token.length < 32) {
  console.error("MCP_AUTH_TOKEN must be set to a strong random token (at least 32 characters). Copy .env.example to .env and configure it.");
  process.exit(1);
}

app.disable("x-powered-by");
app.use(express.json({ limit: maxBytes, strict: true }));

function secureEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
app.use((req, res, next) => {
  const requestHost = String(req.headers.host || "").toLowerCase();
  if (!allowedHosts.has(requestHost)) return res.status(403).json({ error: "Host is not allowed." });
  const auth = String(req.headers.authorization || "");
  const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secureEqual(supplied, token)) return res.status(401).json({ error: "Unauthorized. Provide a valid Bearer token." });
  next();
});
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.all("/mcp", async (req, res) => {
  if (!["GET", "POST", "DELETE"].includes(req.method)) return res.status(405).end();
  const server = new McpServer({ name: "student-mcp-file-server-connector", version: "1.0.0" });
  registerTools(server, workspaceRoot);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { void transport.close(); void server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request failed:", error);
    if (!res.headersSent) res.status(500).json({ error: "MCP request failed." });
  }
});
app.use((error, _req, res, _next) => {
  if (error?.type === "entity.too.large") return res.status(413).json({ error: "Request body is too large." });
  return res.status(400).json({ error: "Invalid request." });
});
app.listen(port, host, () => {
  console.log(`MCP file server listening on http://${host}:${port}/mcp`);
  console.log(`Workspace: ${workspaceRoot}`);
});
