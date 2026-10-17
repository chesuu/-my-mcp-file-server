import test from "node:test";
import assert from "node:assert/strict";
import { getOpenTasks, getOverdueTasks } from "../src/task-utils.js";

const tasks = [
  { id: 1, completed: false, dueDate: "2020-01-01" },
  { id: 2, completed: true, dueDate: "2020-01-01" },
  { id: 3, completed: false, dueDate: "2099-01-01" },
  { id: 4, completed: false }
];

test("getOpenTasks excludes completed tasks", () => {
  assert.deepEqual(getOpenTasks(tasks).map((task) => task.id), [1, 3, 4]);
});

test("getOverdueTasks returns only incomplete tasks with past due dates", () => {
  assert.deepEqual(getOverdueTasks(tasks, new Date("2026-01-01")).map((task) => task.id), [1]);
});
