import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cron from "node-cron";
import { testConnection, initializeDatabase } from "./src/server/db";
import apiRoutes from "./src/server/routes";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 9922;

  // Body parsing middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Initialize PostgreSQL connection and schema
  const connected = await testConnection();
  if (connected) {
    await initializeDatabase();
  } else {
    console.error('WARNING: Could not connect to PostgreSQL. The app may not work correctly.');
  }

  // Monthly Backup Job (Runs at 00:00 on the 1st of every month)
  cron.schedule("0 0 1 * *", () => {
    console.log("[CRON] Running monthly database backup job...");
  });

  // API routes FIRST
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", database: connected ? "connected" : "disconnected" });
  });

  // Mount all API routes under /api
  app.use("/api", apiRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
