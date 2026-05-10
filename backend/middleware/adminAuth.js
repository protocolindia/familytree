const jwt = require("jsonwebtoken");
module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!["ADMIN","SUPERADMIN"].includes(decoded.role))
      return res.status(403).json({ error: "Admin access required" });
    req.user = decoded;
    next();
  } catch { res.status(401).json({ error: "Invalid token" }); }
};
