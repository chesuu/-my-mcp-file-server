import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = new URL(process.env.MCP_URL || `http://127.0.0.1:${process.env.PORT || 3000}/mcp`);
const token = process.env.MCP_AUTH_TOKEN;
if (!token) throw new Error("Set MCP_AUTH_TOKEN in .env before running the demo.");
const transcript = [];
async function session(label, work) {
  const client = new Client({ name: label, version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(endpoint, { requestInit: { headers: { Authorization: `Bearer ${token}` } } });
  await client.connect(transport);
  try { await work(client); } finally { await client.close(); }
}
async function call(client, name, args = {}) {
  const response = await client.callTool({ name, arguments: args });
  transcript.push(`### ${name}\n\nArguments: \x60${JSON.stringify(args)}\x60\n\nResult:\n\x60\x60\x60json\n${JSON.stringify(response, null, 2)}\n\x60\x60\x60\n`);
  console.log(name, JSON.stringify(response));
  return response;
}
await session("demo-session-1", async (client) => {
  await call(client, "list_files", { path: "." });
  await call(client, "write_file", { path: "DEMO_NOTE.md", content: "# Demo note\n\nThe MCP server can safely create workspace files.\n", overwrite: true });
  await call(client, "read_file", { path: "DEMO_NOTE.md" });
});
await session("demo-session-2", async (client) => {
  await call(client, "search_files", { query: "MCP" });
  await call(client, "git_status");
  await call(client, "git_diff");
});
const out = path.resolve("docs/DEMO_TRANSCRIPT.md");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `# Demo transcript\n\nGenerated at ${new Date().toISOString()}\n\n${transcript.join("\n")}\n`);
console.log(`Transcript saved to ${out}`);
