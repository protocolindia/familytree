// routes/masterdata.js
const router    = require("express").Router();
const auth      = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ── VILLAGES ──────────────────────────────────────────────
router.get("/villages", auth, async (_req, res) => {
  try { res.json(await prisma.village.findMany({ orderBy: { name: "asc" } })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/villages", adminAuth, async (req, res) => {
  try {
    const { name, teluguName } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const v = await prisma.village.create({ data: { name: name.trim(), teluguName: (teluguName||name).trim() } });
    res.json(v);
  } catch (e) {
    if (e.code === "P2002") return res.status(400).json({ error: "Village already exists" });
    res.status(500).json({ error: e.message });
  }
});

router.patch("/villages/:id", adminAuth, async (req, res) => {
  try {
    const v = await prisma.village.update({ where: { id: req.params.id }, data: req.body });
    res.json(v);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/villages/:id", adminAuth, async (req, res) => {
  try { await prisma.village.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SURNAMES ──────────────────────────────────────────────
router.get("/surnames", auth, async (_req, res) => {
  try { res.json(await prisma.surname.findMany({ orderBy: { name: "asc" } })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/surnames", adminAuth, async (req, res) => {
  try {
    const { name, teluguName } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const s = await prisma.surname.create({ data: { name: name.trim(), teluguName: (teluguName||name).trim() } });
    res.json(s);
  } catch (e) {
    if (e.code === "P2002") return res.status(400).json({ error: "Surname already exists" });
    res.status(500).json({ error: e.message });
  }
});

router.patch("/surnames/:id", adminAuth, async (req, res) => {
  try {
    const s = await prisma.surname.update({ where: { id: req.params.id }, data: req.body });
    res.json(s);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/surnames/:id", adminAuth, async (req, res) => {
  try { await prisma.surname.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
