require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const app = express();

app.use(cors({
  origin: function (origin, callback) { callback(null, true); },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));
app.options("*", cors());
app.use(express.json({ limit: "10mb" }));

app.get("/",       (_req, res) => res.json({ status: "ok", service: "vamsavriksham-api", version: "2.0.0" }));
app.get("/health", (_req, res) => res.json({ status: "ok", service: "vamsavriksham-api", version: "2.0.0" }));

app.use("/api/auth",     require("./routes/auth"));
app.use("/api/trees",    require("./routes/trees"));
app.use("/api/persons",  require("./routes/persons"));
app.use("/api/ai",       require("./routes/ai"));
app.use("/api/admin",    require("./routes/admin"));
app.use("/api/settings", require("./routes/settings"));

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 API v2.0 running on port ${PORT}`));
