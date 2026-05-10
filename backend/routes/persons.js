const router = require("express").Router();
const auth   = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// POST /api/persons
router.post("/", auth, async (req, res) => {
  try {
    const { treeId, name, nameEn, gender, birth, death, education, occupation, notes } = req.body;
    const person = await prisma.person.create({ data: { treeId, name, nameEn, gender: gender || "male", birth, death, education, occupation, notes } });
    res.json(person);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/persons/:id
router.patch("/:id", auth, async (req, res) => {
  try {
    const { photoBase64, ...fields } = req.body;
    const updated = await prisma.person.update({ where: { id: req.params.id }, data: fields });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/persons/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    await prisma.person.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/persons/relationship
router.post("/relationship", auth, async (req, res) => {
  try {
    const { parentId, childId, relType } = req.body;
    const rel = await prisma.relationship.create({ data: { parentId, childId, relType } });
    res.json(rel);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
