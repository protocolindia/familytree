// routes/persons.js
const router = require("express").Router();
const auth   = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const cloudinary = require("cloudinary").v2;
const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/persons  — add person to a tree
router.post("/", auth, async (req, res) => {
  const { treeId, name, nameEn, gender, birth, death, education, occupation, notes, photoBase64 } = req.body;

  // Verify user can edit this tree
  const tree = await prisma.tree.findUnique({ where: { id: treeId } });
  if (!tree) return res.status(404).json({ error: "Tree not found" });
  const canEdit = tree.ownerId === req.user.id ||
    await prisma.permission.findFirst({ where: { treeId, userId: req.user.id, role: "admin" } });
  if (!canEdit) return res.status(403).json({ error: "No edit permission" });

  // Upload photo to Cloudinary if provided
  let photoUrl = null;
  if (photoBase64) {
    const upload = await cloudinary.uploader.upload(photoBase64, {
      folder: `vamsavriksham/${treeId}`,
      resource_type: "image",
    });
    photoUrl = upload.secure_url;
  }

  const person = await prisma.person.create({
    data: { treeId, name, nameEn, gender: gender || "male", birth, death, education, occupation, notes, photoUrl },
  });
  res.json(person);
});

// PATCH /api/persons/:id  — update person
router.patch("/:id", auth, async (req, res) => {
  const person = await prisma.person.findUnique({ where: { id: req.params.id }, include: { tree: true } });
  if (!person) return res.status(404).json({ error: "Not found" });

  const canEdit = person.tree.ownerId === req.user.id ||
    await prisma.permission.findFirst({ where: { treeId: person.treeId, userId: req.user.id, role: "admin" } });
  if (!canEdit) return res.status(403).json({ error: "No edit permission" });

  const { photoBase64, ...fields } = req.body;
  let photoUrl = person.photoUrl;
  if (photoBase64) {
    const upload = await cloudinary.uploader.upload(photoBase64, {
      folder: `vamsavriksham/${person.treeId}`,
      resource_type: "image",
    });
    photoUrl = upload.secure_url;
  }

  const updated = await prisma.person.update({
    where: { id: req.params.id },
    data: { ...fields, photoUrl },
  });
  res.json(updated);
});

// DELETE /api/persons/:id
router.delete("/:id", auth, async (req, res) => {
  const person = await prisma.person.findUnique({ where: { id: req.params.id }, include: { tree: true } });
  if (!person) return res.status(404).json({ error: "Not found" });
  if (person.tree.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  await prisma.person.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// POST /api/persons/relationship  — link two people
router.post("/relationship", auth, async (req, res) => {
  const { parentId, childId, relType } = req.body;
  const rel = await prisma.relationship.create({ data: { parentId, childId, relType } });
  res.json(rel);
});

// DELETE /api/persons/relationship/:id
router.delete("/relationship/:id", auth, async (req, res) => {
  await prisma.relationship.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

module.exports = router;
