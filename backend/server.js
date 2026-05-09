require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const treeRoutes = require("./routes/trees");
const personRoutes = require("./routes/persons");
const aiRoutes = require("./routes/ai");

const app = express();

// ── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));   // allow base64 image uploads

// ── Health check ──────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", service: "vamsavriksham-api" }));

// ── Routes ────────────────────────────────────────────────
app.use("/api/auth",    authRoutes);
app.use("/api/trees",   treeRoutes);
app.use("/api/persons", personRoutes);
app.use("/api/ai",      aiRoutes);

// ── 404 ───────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Global error handler ──────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 API running on port ${PORT}`));
