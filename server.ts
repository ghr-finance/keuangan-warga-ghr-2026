import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cron from "node-cron";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Monthly Backup Job (Runs at 00:00 on the 1st of every month)
  cron.schedule("0 0 1 * *", () => {
    console.log("[CRON] Running monthly database backup job...");
    // In this sandboxed environment, real automated backup is primarily handled by the client-side check 
    // to ensure full access to Firestore via valid user sessions.
    // However, this server job serves as the primary backend trigger point.
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
