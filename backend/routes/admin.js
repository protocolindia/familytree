const router    = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const auth      = require("../middleware/auth");
const bcrypt    = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ── Stats ─────────────────────────────────────────────────
router.get("/stats", adminAuth, async (_req, res) => {
  try {
    const now  = new Date();
    const week = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const [totalUsers, totalTrees, totalPersons, recentUsers, recentTrees, publicTrees, superAdmins, admins, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.tree.count(),
      prisma.person.count(),
      prisma.user.count({ where: { createdAt: { gte: week } } }),
      prisma.tree.count({ where: { createdAt: { gte: week } } }),
      prisma.tree.count({ where: { visibility: "public" } }),
      prisma.user.count({ where: { role: "SUPERADMIN" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { isActive: true } }),
    ]);
    res.json({ totalUsers, totalTrees, totalPersons, totalRelationships: 0,
      recentUsers, recentTrees, publicTrees, privateTrees: totalTrees - publicTrees,
      superAdmins, admins, activeUsers });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Users ─────────────────────────────────────────────────
router.get("/users", adminAuth, async (_req, res) => {
  try {
    res.json(await prisma.user.findMany({ include: { _count: { select: { ownedTrees: true } } }, orderBy: { createdAt: "desc" } }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/users", adminAuth, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, password: hash, role: role || "USER" }, include: { _count: { select: { ownedTrees: true } } } });
    res.json(user);
  } catch (e) {
    if (e.code === "P2002") return res.status(400).json({ error: "Email already exists" });
    res.status(500).json({ error: e.message });
  }
});

router.patch("/users/:id/role", adminAuth, async (req, res) => {
  try { res.json(await prisma.user.update({ where: { id: req.params.id }, data: { role: req.body.role } })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch("/users/:id/status", adminAuth, async (req, res) => {
  try { res.json(await prisma.user.update({ where: { id: req.params.id }, data: { isActive: req.body.isActive } })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/users/:id", adminAuth, async (req, res) => {
  try { await prisma.user.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Tree assignment per user ──────────────────────────────
// GET /api/admin/users/:id/trees — get trees assigned to user
router.get("/users/:id/trees", adminAuth, async (req, res) => {
  try {
    const perms = await prisma.permission.findMany({
      where: { userId: req.params.id },
      include: { tree: true }
    });
    res.json(perms.map(p => ({ ...p.tree, permissionId: p.id, role: p.role })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/users/:id/trees — assign a tree to user
router.post("/users/:id/trees", adminAuth, async (req, res) => {
  try {
    const { treeId, role } = req.body;
    const perm = await prisma.permission.upsert({
      where: { userId_treeId: { userId: req.params.id, treeId } },
      update: { role: role || "viewer" },
      create: { userId: req.params.id, treeId, role: role || "viewer" }
    });
    res.json(perm);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/users/:id/trees/:treeId — remove tree from user
router.delete("/users/:id/trees/:treeId", adminAuth, async (req, res) => {
  try {
    await prisma.permission.deleteMany({ where: { userId: req.params.id, treeId: req.params.treeId } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin tree management ─────────────────────────────────
router.get("/trees", adminAuth, async (_req, res) => {
  try {
    res.json(await prisma.tree.findMany({
      include: { owner: { select: { id: true, name: true, email: true } }, _count: { select: { persons: true } } },
      orderBy: { createdAt: "desc" }
    }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch("/trees/:id", adminAuth, async (req, res) => {
  try { res.json(await prisma.tree.update({ where: { id: req.params.id }, data: req.body })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/trees/:id", adminAuth, async (req, res) => {
  try { await prisma.tree.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
