import express from "express";
import { body, validationResult } from "express-validator";
import prisma from "../utils/prismaClient.js";
import { formatBodyValidationErrors } from "../utils/responseHelpers.js";
import { TaskStatus } from "@prisma/client";
import {
  startTask,
  pauseTask,
  resumeTask,
  cancelTask,
} from "../utils/taskStore.js";

const router = express.Router();
const TASK_DURATION = 30000;
const STATUS_MESSAGES = {
  [TaskStatus.NOT_STARTED]: "This task hasn't started yet.",
  [TaskStatus.CANCELLED]: "This task is already cancelled.",
  [TaskStatus.IN_PROGRESS]: "This task is already running.",
  [TaskStatus.PAUSED]: "This task is already paused.",
  [TaskStatus.COMPLETED]: "This task is already completed.",
};

/**
 * @route   POST /tasks
 * @desc    Create a new task with a default duration of 30 seconds
 */
router.post(
  "/",
  [body("title").notEmpty(), body("description").notEmpty()],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ error: formatBodyValidationErrors(errors) });
    }

    try {
      const { title, description } = req.body;
      // Create a new task
      const newTask = await prisma.task.create({
        data: { title, description, duration: TASK_DURATION },
      });

      res.status(201).json(newTask);
    } catch (error) {
      console.error("Error creating task:", error);
      res
        .status(500)
        .json({ error: "An error occurred while creating the task." });
    }
  }
);

/**
 * @route   GET /tasks
 * @desc    Get all tasks
 */
router.get("/", async (_, res) => {
  try {
    const tasks = await prisma.task.findMany();
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "An error occurred while fetching tasks." });
  }
});

/**
 * @route   PUT /tasks/run/:taskId
 * @desc    Run a task which hasn't started yet or has been cancelled
 */
router.put("/run/:taskId", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const task = await prisma.task.findUnique({ where: { id: taskId } });

    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }
    // Task must be in NOT_STARTED or CANCELLED status
    if (
      task.status !== TaskStatus.NOT_STARTED &&
      task.status !== TaskStatus.CANCELLED
    ) {
      return res.status(400).json({
        error: `${
          STATUS_MESSAGES[task.status]
        } You can only run a task that hasn't started yet or has been cancelled.`,
      });
    }

    // Update task status to IN_PROGRESS.
    // Although job might not be picked up by worker immediately, this status will be reflected in frontend immediately.
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.IN_PROGRESS },
    });
    // Start execution of task
    startTask(updatedTask);

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error running task:", error);
    res
      .status(500)
      .json({ error: "An error occurred while running the task." });
  }
});

/**
 * @route   PUT /tasks/pause/:taskId
 * @desc    Pause a running task
 */
router.put("/pause/:taskId", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const task = await prisma.task.findUnique({ where: { id: taskId } });

    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }
    // Task must be in progress to pause
    if (task.status !== TaskStatus.IN_PROGRESS) {
      return res.status(400).json({
        error: `${
          STATUS_MESSAGES[task.status]
        } You can only pause a running task.`,
      });
    }

    // Pause the task
    await pauseTask(task);

    const updatedTask = await prisma.task.findUnique({ where: { id: taskId } });
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error pausing task:", error);
    res
      .status(500)
      .json({ error: "An error occurred while pausing the task." });
  }
});

/**
 * @route   PUT /tasks/resume/:taskId
 * @desc    Resume a paused task
 */
router.put("/resume/:taskId", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const task = await prisma.task.findUnique({ where: { id: taskId } });

    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }
    // Task must be paused to resume
    if (task.status !== TaskStatus.PAUSED) {
      return res.status(400).json({
        error: `${
          STATUS_MESSAGES[task.status]
        } You can only resume a paused task.`,
      });
    }

    // Resume the task
    await resumeTask(task);

    const updatedTask = await prisma.task.findUnique({ where: { id: taskId } });
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error resuming task:", error);
    res
      .status(500)
      .json({ error: "An error occurred while resuming the task." });
  }
});

/**
 * @route   PUT /tasks/cancel/:taskId
 * @desc    Cancel a task that is in progress or paused
 */
router.put("/cancel/:taskId", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const task = await prisma.task.findUnique({ where: { id: taskId } });

    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }
    // Task must be either IN_PROGRESS or PAUSED to cancel
    if (![TaskStatus.IN_PROGRESS, TaskStatus.PAUSED].includes(task.status)) {
      return res.status(400).json({
        error: `${
          STATUS_MESSAGES[task.status]
        } You can only cancel a running or paused task.`,
      });
    }

    // Cancel the task
    await cancelTask(task);

    const updatedTask = await prisma.task.findUnique({ where: { id: taskId } });
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error cancelling task:", error);
    res
      .status(500)
      .json({ error: "An error occurred while cancelling the task." });
  }
});

export default router;
