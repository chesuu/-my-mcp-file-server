import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const execFileAsync = promisify(execFile);
export const MAX_FILE_BYTES = 1024 * 1024;
const IGNORED_DIRS = new Set([".git", "node_modules", ".DS_Store"]);
const isInside = (root, target) => {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

export function getWorkspaceRoot(env = process.env) {
  const configured = env.WORKSPACE_DIR?.trim();
  const root = path.resolve(configured || path.join(process.cwd(), "workspace"));
  fs.mkdirSync(root, { recursive: true });
  return fs.realpathSync(root);
}
export function resolveSafePath(root, input = ".") {
  if (typeof input !== "string" || input.includes("\0")) throw new Error("A valid relative path is required.");
  if (path.isAbsolute(input)) throw new Error("Absolute paths are not allowed.");
  const candidate = path.resolve(root, input);
  if (!isInside(root, candidate)) throw new Error("Path escapes the workspace.");
  let ancestor = candidate;
  const suffix = [];
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw new Error("Unable to resolve path.");
    suffix.unshift(path.basename(ancestor));
    ancestor = parent;
  }
  const realAncestor = fs.realpathSync(ancestor);
  if (!isInside(root, realAncestor)) throw new Error("Symlink points outside the workspace.");
  const result = path.resolve(realAncestor, ...suffix);
  if (!isInside(root, result)) throw new Error("Path escapes the workspace.");
  return result;
}
export function safeFilePath(root, input, { allowRoot = false } = {}) {
  const target = resolveSafePath(root, input);
  if (!allowRoot && target === root) throw new Error("The workspace root cannot be used as a file.");
  if (fs.existsSync(target)) {
    const stat = fs.statSync(target);
    if (stat.isFile() && stat.nlink > 1) throw new Error("Hard-linked files are not allowed.");
  }
  return target;
}
export function listWorkspace(root, input = ".") {
  const target = resolveSafePath(root, input);
  if (!fs.statSync(target).isDirectory()) throw new Error("Path is not a directory.");
  return fs.readdirSync(target, { withFileTypes: true })
    .filter((entry) => !IGNORED_DIRS.has(entry.name))
    .map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other" }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function readTextFile(root, input) {
  const target = safeFilePath(root, input);
  const stat = fs.statSync(target);
  if (!stat.isFile()) throw new Error("Path is not a file.");
  if (stat.size > MAX_FILE_BYTES) throw new Error("File exceeds the 1 MB limit.");
  const data = fs.readFileSync(target);
  if (data.includes(0)) throw new Error("Binary files cannot be read as text.");
  return data.toString("utf8");
}
export function writeTextFile(root, input, content, overwrite = false) {
  if (typeof content !== "string") throw new Error("Content must be text.");
  if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) throw new Error("Content exceeds the 1 MB limit.");
  let target = safeFilePath(root, input);
  if (fs.existsSync(target) && !overwrite) throw new Error("File exists. Set overwrite=true to replace it.");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  target = safeFilePath(root, input);
  fs.writeFileSync(target, content, { encoding: "utf8", flag: "w" });
  return { path: path.relative(root, target), bytes: Buffer.byteLength(content, "utf8") };
}
export function replaceText(root, input, oldText, newText) {
  if (!oldText) throw new Error("old_text must not be empty.");
  const target = safeFilePath(root, input);
  const original = readTextFile(root, input);
  const first = original.indexOf(oldText);
  if (first < 0) throw new Error("The requested text was not found.");
  if (original.indexOf(oldText, first + oldText.length) !== -1) throw new Error("Text must match exactly once.");
  const updated = original.slice(0, first) + newText + original.slice(first + oldText.length);
  if (Buffer.byteLength(updated, "utf8") > MAX_FILE_BYTES) throw new Error("Updated file exceeds the 1 MB limit.");
  fs.writeFileSync(target, updated, "utf8");
  return { path: path.relative(root, target), replaced: true };
}
export function deleteTextFile(root, input, confirm = false) {
  if (confirm !== true) throw new Error("Set confirm=true to delete a file.");
  const target = safeFilePath(root, input);
  if (fs.lstatSync(target).isDirectory()) throw new Error("Directory deletion is not supported.");
  fs.unlinkSync(target);
  return { path: path.relative(root, target), deleted: true };
}
export function searchWorkspace(root, query, input = ".", maxResults = 100) {
  if (!query) throw new Error("Search query must not be empty.");
  const start = resolveSafePath(root, input);
  if (!fs.statSync(start).isDirectory()) throw new Error("Search path is not a directory.");
  const results = [];
  const needle = query.toLocaleLowerCase();
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (results.length >= maxResults) return;
      if (IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) {
        try {
          const stat = fs.statSync(full);
          if (stat.size > MAX_FILE_BYTES) continue;
          const buf = fs.readFileSync(full);
          if (buf.includes(0)) continue;
          buf.toString("utf8").split(/\r?\n/).forEach((line, i) => {
            if (results.length < maxResults && line.toLocaleLowerCase().includes(needle)) results.push({ path: path.relative(root, full), line: i + 1, text: line });
          });
        } catch { /* Skip unreadable files. */ }
      }
    }
  }
  visit(start);
  return { query, results, truncated: results.length >= maxResults };
}

const result = (value) => ({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] });
const fail = (error) => result({ error: error instanceof Error ? error.message : String(error) });
export function registerTools(server, root) {
  server.tool("list_files", "List workspace files and directories.", { path: z.string().default(".") }, async ({ path }) => {
    try { return result({ path, entries: listWorkspace(root, path) }); } catch (e) { return fail(e); }
  });
  server.tool("read_file", "Read a UTF-8 text file from the workspace.", { path: z.string() }, async ({ path }) => {
    try { return result(readTextFile(root, path)); } catch (e) { return fail(e); }
  });
  server.tool("write_file", "Create a text file, or overwrite it only when overwrite=true.", { path: z.string(), content: z.string(), overwrite: z.boolean().default(false) }, async ({ path, content, overwrite }) => {
    try { return result(writeTextFile(root, path, content, overwrite)); } catch (e) { return fail(e); }
  });
  server.tool("str_replace", "Replace an exact text string that occurs once in a file.", { path: z.string(), old_text: z.string().min(1), new_text: z.string() }, async ({ path, old_text, new_text }) => {
    try { return result(replaceText(root, path, old_text, new_text)); } catch (e) { return fail(e); }
  });
  server.tool("delete_file", "Delete a file only when confirm=true; directories are blocked.", { path: z.string(), confirm: z.boolean().default(false) }, async ({ path, confirm }) => {
    try { return result(deleteTextFile(root, path, confirm)); } catch (e) { return fail(e); }
  });
  server.tool("search_files", "Search workspace text files without case sensitivity.", { query: z.string().min(1), path: z.string().default("."), max_results: z.number().int().min(1).max(500).default(100) }, async ({ query, path, max_results }) => {
    try { return result(searchWorkspace(root, query, path, max_results)); } catch (e) { return fail(e); }
  });
  server.tool("git_status", "Show Git status for the workspace.", {}, async () => {
    try {
      const { stdout } = await execFileAsync("git", ["-C", root, "status", "--short", "--branch"], { timeout: 10000 });
      return result(stdout || "(clean)");
    } catch { return fail(new Error("Git status failed. Ensure Git is installed and workspace/ is a Git repository.")); }
  });
  server.tool("git_diff", "Show unstaged Git changes in the workspace.", { path: z.string().optional() }, async ({ path }) => {
    try {
      const args = ["-C", root, "diff", "--"];
      if (path) args.push(safeFilePath(root, path));
      const { stdout } = await execFileAsync("git", args, { timeout: 10000, maxBuffer: 1024 * 1024 });
      return result(stdout || "(no unstaged changes)");
    } catch (e) { return fail(e); }
  });
}
function secureEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function createApp() {
  const app = express();
  const host = process.env.HOST || "127.0.0.1";
  const token = process.env.MCP_AUTH_TOKEN || "";
  const allowedHosts = new Set((process.env.MCP_ALLOWED_HOSTS || "localhost,127.0.0.1,localhost:3000,127.0.0.1:3000").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
  const workspaceRoot = getWorkspaceRoot();
  const maxBytes = Number(process.env.MAX_REQUEST_BYTES || 1048576);
  if (token.length < 32) throw new Error("MCP_AUTH_TOKEN must be set to a strong random token (at least 32 characters). Copy .env.example to .env and configure it.");
  app.disable("x-powered-by");
  app.use(express.json({ limit: maxBytes, strict: true }));
  app.use((req, res, next) => {
    if (!allowedHosts.has(String(req.headers.host || "").toLowerCase())) return res.status(403).json({ error: "Host is not allowed." });
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
  return { app, host, port: Number(process.env.PORT || 3000), workspaceRoot };
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const { app, host, port, workspaceRoot } = createApp();
    app.listen(port, host, () => {
      console.log(`MCP file server listening on http://${host}:${port}/mcp`);
      console.log(`Workspace: ${workspaceRoot}`);
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
