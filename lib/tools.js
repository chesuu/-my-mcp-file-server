import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { deleteTextFile, listWorkspace, readTextFile, replaceText, safeFilePath, searchWorkspace, writeTextFile } from "./workspace.js";

const execFileAsync = promisify(execFile);
const result = (value) => ({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] });
const fail = (error) => result({ error: error instanceof Error ? error.message : String(error) });

export function registerTools(server, root) {
  server.tool("list_files", "List workspace files and directories.", { path: z.string().default(".") }, async ({ path }) => {
    try { return result({ path, entries: listWorkspace(root, path) }); } catch (e) { return fail(e); }
  });
  server.tool("read_file", "Read a UTF-8 text file from the workspace.", { path: z.string() }, async ({ path }) => {
    try { return result(readTextFile(root, path)); } catch (e) { return fail(e); }
  });
  server.tool("write_file", "Create a text file, or overwrite it only when overwrite=true.", {
    path: z.string(), content: z.string(), overwrite: z.boolean().default(false)
  }, async ({ path, content, overwrite }) => {
    try { return result(writeTextFile(root, path, content, overwrite)); } catch (e) { return fail(e); }
  });
  server.tool("str_replace", "Replace an exact text string that occurs once in a file.", {
    path: z.string(), old_text: z.string().min(1), new_text: z.string()
  }, async ({ path, old_text, new_text }) => {
    try { return result(replaceText(root, path, old_text, new_text)); } catch (e) { return fail(e); }
  });
  server.tool("delete_file", "Delete a file only when confirm=true; directories are blocked.", {
    path: z.string(), confirm: z.boolean().default(false)
  }, async ({ path, confirm }) => {
    try { return result(deleteTextFile(root, path, confirm)); } catch (e) { return fail(e); }
  });
  server.tool("search_files", "Search workspace text files without case sensitivity.", {
    query: z.string().min(1), path: z.string().default("."), max_results: z.number().int().min(1).max(500).default(100)
  }, async ({ query, path, max_results }) => {
    try { return result(searchWorkspace(root, query, path, max_results)); } catch (e) { return fail(e); }
  });
  server.tool("git_status", "Show Git status for the workspace.", {}, async () => {
    try {
      const { stdout } = await execFileAsync("git", ["-C", root, "status", "--short", "--branch"], { timeout: 10000 });
      return result(stdout || "(clean)");
    } catch { return fail(new Error("Git status failed. Ensure Git is installed and workspace/ is a Git repository.")); }
  });
  server.tool("git_diff", "Show unstaged Git changes in the workspace.", {
    path: z.string().optional()
  }, async ({ path }) => {
    try {
      const args = ["-C", root, "diff", "--"];
      if (path) args.push(safeFilePath(root, path));
      const { stdout } = await execFileAsync("git", args, { timeout: 10000, maxBuffer: 1024 * 1024 });
      return result(stdout || "(no unstaged changes)");
    } catch (e) { return fail(e); }
  });
}
