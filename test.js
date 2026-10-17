import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { deleteTextFile, readTextFile, replaceText, resolveSafePath, safeFilePath, writeTextFile } from "./server.js";

function fixture(fn) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-workspace-"));
  const root = path.join(base, "workspace");
  fs.mkdirSync(root);
  try { fn(root, base); } finally { fs.rmSync(base, { recursive: true, force: true }); }
}

test("rejects traversal and absolute paths", () => fixture((root) => {
  assert.throws(() => resolveSafePath(root, "../outside"), /escapes/);
  assert.throws(() => resolveSafePath(root, path.resolve(root, "file.txt")), /Absolute/);
}));
test("creates, reads, and replaces a text file only once", () => fixture((root) => {
  writeTextFile(root, "note.txt", "hello world");
  assert.equal(readTextFile(root, "note.txt"), "hello world");
  replaceText(root, "note.txt", "world", "MCP");
  assert.equal(readTextFile(root, "note.txt"), "hello MCP");
  writeTextFile(root, "note.txt", "overwritten", true);
  assert.equal(readTextFile(root, "note.txt"), "overwritten");
}));
test("requires confirmation before deleting a file", () => fixture((root) => {
  writeTextFile(root, "delete-me.txt", "temporary");
  assert.throws(() => deleteTextFile(root, "delete-me.txt"), /confirm=true/);
  deleteTextFile(root, "delete-me.txt", true);
  assert.equal(fs.existsSync(path.join(root, "delete-me.txt")), false);
}));
test("rejects symlinks that point outside the workspace", () => fixture((root, base) => {
  const outside = path.join(base, "outside.txt");
  fs.writeFileSync(outside, "private");
  try {
    fs.symlinkSync(outside, path.join(root, "escape.txt"));
    assert.throws(() => safeFilePath(root, "escape.txt"), /outside/);
  } catch (error) {
    if (error.code !== "EPERM" && error.code !== "EACCES") throw error;
  }
}));
