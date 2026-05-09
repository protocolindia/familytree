// src/App.jsx
// Paste the full VamsaVriksham.jsx content here,
// updated to call /api/* instead of Anthropic directly.

import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || "" });

// Attach JWT token to every request
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Paste full App component here ─────────────────────────
// Replace direct fetch("https://api.anthropic.com/...") calls with:
//   API.post("/api/ai/extract", { imageBase64, mediaType })
//   API.post("/api/ai/chat",    { messages, treeContext })
//
// Replace tree CRUD fetch calls with:
//   API.get("/api/trees")
//   API.post("/api/trees", data)
//   API.get("/api/trees/:id")
//   API.patch("/api/trees/:id", data)
//   API.post("/api/persons", data)
//   API.patch("/api/persons/:id", data)
//   API.post("/api/auth/login", { email, password })
//   API.post("/api/auth/register", { email, name, password })
// ─────────────────────────────────────────────────────────

export default function App() {
  return <div style={{ padding: 24, fontFamily: "Noto Sans Telugu, sans-serif" }}>
    <h1>వంశవృక్షం — Paste full App component here</h1>
    <p style={{ marginTop: 8, color: "#666" }}>Copy VamsaVriksham.jsx content into this file and update API calls as noted above.</p>
  </div>;
}
