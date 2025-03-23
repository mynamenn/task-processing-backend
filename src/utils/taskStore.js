import prisma from "../utils/prismaClient.js";
import { TaskStatus } from "@prisma/client";

// In-memory task store mapping taskId to timer object
const taskStore = {};

/**
 * Simulate a task running.
 *
 * This creates a timer object which completes the task after the duration.
 */
export async function startTask(task) {
  // Check if task is already running
  if (taskStore[task.id]) {
    console.log("Task already started:", task.id);
    return;
  }

  // Update lastRunAt
  const updatedTask = await prisma.task.update({
    where: { id: task.id },
    data: {
      status: TaskStatus.IN_PROGRESS,
      lastRunAt: new Date(),
      elapsedTime: 0,
    },
  });

  // Create timer object which completes task after duration
  taskStore[task.id] = setTimeout(async () => {
    completeTask(updatedTask);
  }, task.duration);
}

/**
 * Simulate pausing a task.
 *
 * This updates the task's status to PAUSED and elapsedTime.
 */
export async function pauseTask(task) {
  if (!taskStore[task.id]) {
    console.log("Task doesn't exist in task store:", task.id);
    return;
  }

  const elapsedTime =
    task.elapsedTime + new Date().getTime() - task.lastRunAt.getTime();
  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: TaskStatus.PAUSED,
      elapsedTime: elapsedTime,
    },
  });

  clearTimeout(taskStore[task.id]);
  delete taskStore[task.id];
}

/**
 * Resume a paused task.
 *
 * This updates the task's status to IN_PROGRESS, sets lastRunAt to current time,
 * and creates a new timer to complete the task after the remaining duration.
 */
export async function resumeTask(task) {
  if (taskStore[task.id]) {
    console.log("Task already running:", task.id);
    return;
  }

  // Calculate remaining duration based on elapsed time
  const remainingDuration = Math.max(0, task.duration - task.elapsedTime);
  const updatedTask = await prisma.task.update({
    where: { id: task.id },
    data: {
      lastRunAt: new Date(),
      status: TaskStatus.IN_PROGRESS,
    },
  });

  // Create timer object which completes task after remaining duration
  taskStore[task.id] = setTimeout(async () => {
    completeTask(updatedTask);
  }, remainingDuration);

  console.log(
    "Task resumed:",
    task.id,
    "with remaining duration:",
    remainingDuration
  );
}

/**
 * Cancel a task.
 *
 * This clears the timer object and updates the task's status to CANCELLED in DB.
 */
export async function cancelTask(task) {
  // If task is still running, remove from taskStore
  if (taskStore[task.id]) {
    clearTimeout(taskStore[task.id]);
    delete taskStore[task.id];
  }

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: TaskStatus.CANCELLED,
      elapsedTime: 0,
    },
  });

  console.log("Task cancelled:", task.id);
}

/**
 * Completes a task by updating the task's status, result, and completedAt in DB.
 */
async function completeTask(task) {
  const elapsedTime =
    task.elapsedTime + new Date().getTime() - task.lastRunAt.getTime();

  await prisma.task.update({
    where: { id: task.id },
    data: {
      result: generateRandomResult(),
      status: TaskStatus.COMPLETED,
      completedAt: new Date(),
      elapsedTime: elapsedTime,
    },
  });

  delete taskStore[task.id];
  console.log("Task completed:", task.id);
}

// Select a random result from the list
function generateRandomResult() {
  const results = [
    "🥤 Bubble tea",
    "🍕 Pizza",
    "🍔 Burger",
    "🥗 Salad",
    "🍣 Sushi",
    "🍝 Pasta",
    "🍦 Ice cream",
    "🌮 Tacos",
    "🍜 Pad thai",
    "🍢 Korean BBQ",
    "🍲 Pho",
    "🍣 Sushi",
    "🍝 Pasta",
    "🍦 Ice cream",
    "🌮 Tacos",
    "🍜 Pad thai",
  ];

  return results[Math.floor(Math.random() * results.length)];
}
