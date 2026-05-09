// routes/trees.js
const router = require("express").Router();
const auth   = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /api/trees  — all trees owned by or shared with user
router.get("/", auth, async (req, res) => {
  const owned = await prisma.tree.findMany({
    where: { ownerId: req.user.id },
    include: { _count: { select: { persons: true } } },
    orderBy: { createdAt: "desc" },
  });
  const shared = await prisma.permission.findMany({
    where: { userId: req.user.id },
    include: { tree: { include: { _count: { select: { persons: true } } } } },
  });
  res.json({ owned, shared: shared.map(p => ({ ...p.tree, role: p.role })) });
});

// POST /api/trees  — create new tree
router.post("/", auth, async (req, res) => {
  const { name, nameEn, description, visibility } = req.body;
  const tree = await prisma.tree.create({
    data: { name, nameEn, description, visibility: visibility || "private", ownerId: req.user.id },
  });
  res.json(tree);
});

// GET /api/trees/:id  — full tree with persons & relationships
router.get("/:id", auth, async (req, res) => {
  const tree = await prisma.tree.findUnique({
    where: { id: req.params.id },
    include: {
      persons: { include: { parentRels: true, childRels: true } },
      permissions: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
  });
  if (!tree) return res.status(404).json({ error: "Tree not found" });
  // Check access
  const isOwner = tree.ownerId === req.user.id;
  const hasAccess = isOwner || tree.visibility === "public" ||
    tree.permissions.some(p => p.userId === req.user.id);
  if (!hasAccess) return res.status(403).json({ error: "Access denied" });
  res.json(tree);
});

// PATCH /api/trees/:id  — update tree settings
router.patch("/:id", auth, async (req, res) => {
  const tree = await prisma.tree.findUnique({ where: { id: req.params.id } });
  if (!tree || tree.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  const updated = await prisma.tree.update({
    where: { id: req.params.id },
    data: { name: req.body.name, nameEn: req.body.nameEn, visibility: req.body.visibility },
  });
  res.json(updated);
});

// DELETE /api/trees/:id
router.delete("/:id", auth, async (req, res) => {
  const tree = await prisma.tree.findUnique({ where: { id: req.params.id } });
  if (!tree || tree.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  await prisma.tree.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// POST /api/trees/:id/invite  — invite a user as viewer/admin
router.post("/:id/invite", auth, async (req, res) => {
  const tree = await prisma.tree.findUnique({ where: { id: req.params.id } });
  if (!tree || tree.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  const invitee = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!invitee) return res.status(404).json({ error: "User not found" });
  const perm = await prisma.permission.upsert({
    where: { userId_treeId: { userId: invitee.id, treeId: req.params.id } },
    update: { role: req.body.role || "viewer" },
    create: { userId: invitee.id, treeId: req.params.id, role: req.body.role || "viewer" },
  });
  res.json(perm);
});

module.exports = router;
