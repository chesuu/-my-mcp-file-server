export function getOpenTasks(tasks) {
  return tasks.filter((task) => !task.completed);
}

export function getOverdueTasks(tasks, now = new Date()) {
  const current = now instanceof Date ? now : new Date(now);
  return tasks.filter((task) => !task.completed && task.dueDate && new Date(task.dueDate) < current);
}
