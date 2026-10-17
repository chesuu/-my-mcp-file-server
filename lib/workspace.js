import fs from "node:fs";
import path from "node:path";

export const MAX_FILE_BYTES = 1024 * 1024;
const IGNORED_DIRS = new Set([".git", "node_modules", ".DS_Store"]);

export function getWorkspaceRoot(env = process.env) {
  const configured = env.WORKSPACE_DIR?.trim();
  const root = path.resolve(configured || path.join(process.cwd(), "workspace"));
  fs.mkdirSync(root, { recursive: true });
  return fs.realpathSync(root);
}

function isInside(root, target) {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
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
  const stat = fs.lstatSync(target);
  if (stat.isDirectory()) throw new Error("Directory deletion is not supported.");
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
            if (results.length < maxResults && line.toLocaleLowerCase().includes(needle)) {
              results.push({ path: path.relative(root, full), line: i + 1, text: line });
            }
          });
        } catch { /* Skip unreadable files. */ }
      }
    }
  }
  visit(start);
  return { query, results, truncated: results.length >= maxResults };
}
