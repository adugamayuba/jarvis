import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initFirebase } from "./services/firebase";
import { errorHandler, notFound } from "./middleware/errorHandler";
import scrapeRoutes from "./routes/scrape";
import contactsRoutes from "./routes/contacts";
import emailRoutes from "./routes/email";
import authRoutes from "./routes/auth";
import aiRoutes from "./routes/ai";
import investorsRoutes from "./routes/investors";
import bulkImportRoutes from "./routes/bulkImport";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check — available at both /health and /api/health (via proxy)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/investors", investorsRoutes);
app.use("/api/import", bulkImportRoutes);
app.use("/api/scrape", scrapeRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/email", emailRoutes);

// 404 & error handler
app.use(notFound);
app.use(errorHandler);

// Start — server always boots, Firebase errors surface at request time
async function bootstrap() {
  try {
    initFirebase();
    console.log("✅ Firebase initialized");
  } catch (err) {
    console.error("⚠️  Firebase init failed (check env vars):", (err as Error).message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Jarvis backend running on port ${PORT}`);
  });
}

bootstrap();
