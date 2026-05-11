const router = require("express").Router();
const auth   = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /api/trees — all trees for user
router.get("/", auth, async (req, res) => {
  try {
    const owned  = await prisma.tree.findMany({
      where: { ownerId: req.user.id },
      orderBy: { updatedAt: "desc" }
    });
    const shared = await prisma.permission.findMany({
      where: { userId: req.user.id },
      include: { tree: true }
    });
    res.json({ owned, shared: shared.map(p => ({ ...p.tree, role: p.role })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/trees — create tree
router.post("/", auth, async (req, res) => {
  try {
    const { name, nameEn, description, visibility } = req.body;
    const tree = await prisma.tree.create({
      data: { name, nameEn, description, visibility: visibility || "private", ownerId: req.user.id }
    });
    res.json(tree);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/trees/:id — full tree with treeData
router.get("/:id", auth, async (req, res) => {
  try {
    const tree = await prisma.tree.findUnique({
      where: { id: req.params.id },
      include: { permissions: true }
    });
    if (!tree) return res.status(404).json({ error: "Not found" });
    const isOwner  = tree.ownerId === req.user.id;
    const hasAccess = isOwner || tree.visibility === "public" ||
      tree.permissions.some(p => p.userId === req.user.id);
    if (!hasAccess) return res.status(403).json({ error: "Access denied" });
    res.json(tree);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/trees/:id — update tree (including treeData for full save)
router.patch("/:id", auth, async (req, res) => {
  try {
    const { treeData, memberCount, name, nameEn, visibility, description } = req.body;
    const data = {};
    if (name        !== undefined) data.name        = name;
    if (nameEn      !== undefined) data.nameEn      = nameEn;
    if (visibility  !== undefined) data.visibility  = visibility;
    if (description !== undefined) data.description = description;
    if (treeData    !== undefined) data.treeData    = treeData;
    if (memberCount !== undefined) data.memberCount = memberCount;
    const updated = await prisma.tree.update({ where: { id: req.params.id }, data });
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
