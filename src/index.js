import express from "express";
import cors from "cors";
import taskRoutes from "./routes/task.js";

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS for all routes
app.use(cors());

// Parses JSON bodies
app.use(express.json());
// Parses form data
app.use(express.urlencoded({ extended: true }));

app.use("/tasks", taskRoutes);

// Health check endpoint
app.get("/health", (_, res) => {
  res.status(200).json({ status: "ok" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

export default app;
