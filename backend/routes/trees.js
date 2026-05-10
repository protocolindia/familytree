const router = require("express").Router();
const auth   = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /api/trees
router.get("/", auth, async (req, res) => {
  try {
    const owned  = await prisma.tree.findMany({ where: { ownerId: req.user.id }, include: { _count: { select: { persons: true } } }, orderBy: { createdAt: "desc" } });
    const shared = await prisma.permission.findMany({ where: { userId: req.user.id }, include: { tree: { include: { _count: { select: { persons: true } } } } } });
    res.json({ owned, shared: shared.map(p => ({ ...p.tree, role: p.role })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/trees
router.post("/", auth, async (req, res) => {
  try {
    const { name, nameEn, description, visibility } = req.body;
    const tree = await prisma.tree.create({ data: { name, nameEn, description, visibility: visibility || "private", ownerId: req.user.id } });
    res.json(tree);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/trees/:id
router.get("/:id", auth, async (req, res) => {
  try {
    const tree = await prisma.tree.findUnique({ where: { id: req.params.id }, include: { persons: true, permissions: true } });
    if (!tree) return res.status(404).json({ error: "Not found" });
    res.json(tree);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/trees/:id
router.patch("/:id", auth, async (req, res) => {
  try {
    const updated = await prisma.tree.update({ where: { id: req.params.id }, data: req.body });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/trees/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    await prisma.tree.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/trees/:id/invite
router.post("/:id/invite", auth, async (req, res) => {
  try {
    const invitee = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!invitee) return res.status(404).json({ error: "User not found" });
    const perm = await prisma.permission.upsert({
      where: { userId_treeId: { userId: invitee.id, treeId: req.params.id } },
      update: { role: req.body.role || "viewer" },
      create: { userId: invitee.id, treeId: req.params.id, role: req.body.role || "viewer" },
    });
    res.json(perm);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
