const router    = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const bcrypt    = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma    = new PrismaClient();

router.use(adminAuth);

// GET /api/admin/stats
router.get("/stats", async (_req, res) => {
  try {
    const [totalUsers, totalTrees, totalPersons, totalRelationships, publicTrees, privateTrees, superAdmins, admins, activeUsers] = await Promise.all([
      prisma.user.count(), prisma.tree.count(), prisma.person.count(), prisma.relationship.count(),
      prisma.tree.count({ where: { visibility: "public" } }),
      prisma.tree.count({ where: { visibility: "private" } }),
      prisma.user.count({ where: { role: "SUPERADMIN" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { isActive: true } }),
    ]);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = await prisma.user.count({ where: { createdAt: { gte: since } } });
    const recentTrees = await prisma.tree.count({ where: { createdAt: { gte: since } } });
    res.json({ totalUsers, totalTrees, totalPersons, totalRelationships, publicTrees, privateTrees, superAdmins, admins, activeUsers, recentUsers, recentTrees });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/users
router.get("/users", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, _count: { select: { ownedTrees: true } } } });
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/users
router.post("/users", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ error: "Email already exists" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, password: hashed, role: role || "USER" }, select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, _count: { select: { ownedTrees: true } } } });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/users/:id/role
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    if (!["USER","ADMIN","SUPERADMIN"].includes(role)) return res.status(400).json({ error: "Invalid role" });
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role }, select: { id: true, role: true } });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/users/:id/status
router.patch("/users/:id/status", async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: "Cannot deactivate yourself" });
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: req.body.isActive }, select: { id: true, isActive: true } });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/trees
router.get("/trees", async (_req, res) => {
  try {
    const trees = await prisma.tree.findMany({ orderBy: { createdAt: "desc" }, include: { owner: { select: { id: true, name: true, email: true } }, _count: { select: { persons: true } } } });
    res.json(trees);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/trees/:id
router.patch("/trees/:id", async (req, res) => {
  try {
    const tree = await prisma.tree.update({ where: { id: req.params.id }, data: { visibility: req.body.visibility } });
    res.json(tree);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/trees/:id
router.delete("/trees/:id", async (req, res) => {
  try {
    await prisma.tree.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
