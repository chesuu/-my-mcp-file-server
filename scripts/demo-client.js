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
  try { await work(client); }
  finally { await client.close(); }
}
async function call(client, name, args = {}) {
  const response = await client.callTool({ name, arguments: args });
  transcript.push(`### ${name}\n\nArguments: \`${JSON.stringify(args)}\`\n\nResult:\n\`\`\`json\n${JSON.stringify(response, null, 2)}\n\`\`\`\n`);
  console.log(name, JSON.stringify(response));
  return response;
}
await session("handoff-session-1", async (client) => {
  await call(client, "list_files", { path: "." });
  await call(client, "read_file", { path: "src/task-utils.js" });
  await call(client, "write_file", { path: "PROJECT_STATE.md", content: "# Project state\n\nSession 1 reviewed the task utilities. Session 2 should add getOverdueTasks and tests.\n", overwrite: true });
  await call(client, "write_file", { path: "PLAN_LOG.md", content: "# Plan log\n\n- Session 1: inspect files and save handoff notes.\n- Session 2: implement overdue-task filtering and test it.\n", overwrite: true });
});
await session("handoff-session-2", async (client) => {
  await call(client, "read_file", { path: "PROJECT_STATE.md" });
  await call(client, "read_file", { path: "PLAN_LOG.md" });
  await call(client, "search_files", { query: "getOpenTasks" });
  await call(client, "git_status");
  await call(client, "git_diff");
});
const out = path.resolve("docs/DEMO_TRANSCRIPT.md");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `# Demo transcript\n\nGenerated at ${new Date().toISOString()}\n\n${transcript.join("\n")}\n`);
console.log(`Transcript saved to ${out}`);
