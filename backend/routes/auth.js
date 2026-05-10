const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const sign = u => jwt.sign(
  { id: u.id, email: u.email, role: u.role },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password)
      return res.status(400).json({ error: "All fields required" });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ error: "Email already registered" });

    // First user ever becomes SUPERADMIN
    const count  = await prisma.user.count();
    const role   = count === 0 ? "SUPERADMIN" : "USER";
    const hashed = await bcrypt.hash(password, 10);
    const user   = await prisma.user.create({ data: { email, name, password: hashed, role } });

    res.json({
      token: sign(user),
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (e) {
    console.error("Register error:", e);
    res.status(500).json({ error: "Registration failed: " + e.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: "Invalid email or password" });
    if (!user.isActive)
      return res.status(403).json({ error: "Account deactivated. Contact admin." });

    res.json({
      token: sign(user),
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ error: "Login failed: " + e.message });
  }
});

// GET /api/auth/me
router.get("/me", require("../middleware/auth"), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  res.json(user);
});

module.exports = router;
