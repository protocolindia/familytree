// routes/settings.js
const router    = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Sensitive keys that should be masked in GET response
const MASKED = ["smtp_pass","anthropic_api_key","cloudinary_api_secret","cloudinary_api_key"];

// GET /api/settings — returns all settings (masked)
router.get("/", adminAuth, async (_req, res) => {
  try {
    const rows = await prisma.setting.findMany();
    const obj  = {};
    rows.forEach(r => {
      obj[r.key] = MASKED.includes(r.key) && r.value ? "••••••••" : r.value;
    });
    res.json(obj);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/settings — upsert multiple settings
router.post("/", adminAuth, async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      // Skip masked placeholder values — don't overwrite real keys with "••••••••"
      if (value === "••••••••") continue;
      if (value === "" || value === null || value === undefined) continue;
      await prisma.setting.upsert({
        where:  { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/settings/public — non-sensitive settings for frontend
router.get("/public", async (_req, res) => {
  try {
    const SAFE_KEYS = ["app_name","app_tagline","allow_registration","maintenance_mode","enable_ai_chat","enable_photo_upload","enable_public_trees"];
    const rows = await prisma.setting.findMany({ where: { key: { in: SAFE_KEYS } } });
    const obj  = {};
    rows.forEach(r => obj[r.key] = r.value);
    res.json(obj);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
