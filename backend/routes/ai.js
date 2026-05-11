const router = require("express").Router();
const auth   = require("../middleware/auth");

const CLAUDE = "https://api.anthropic.com/v1/messages";
const headers = () => ({
  "Content-Type": "application/json",
  "x-api-key": process.env.ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
});

// POST /api/ai/extract
router.post("/extract", auth, async (req, res) => {
  try {
    const { imageBase64, mediaType } = req.body;
    const resp = await fetch(CLAUDE, { method: "POST", headers: headers(), body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 2000,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } },
        { type: "text", text: `Analyze this Telugu genealogy document. Extract all family members and relationships.
Return ONLY valid JSON: {"title":"Telugu family name","titleEn":"English name","persons":[{"id":"p1","name":"Telugu name","nameEn":"English name","education":"degree if any"}],"relationships":[{"parentId":"p1","childId":"p2"}]}` }
      ]}]
    })});
    const data = await resp.json();
    const text = data.content?.find(c => c.type === "text")?.text || "{}";
    res.json(JSON.parse(text.replace(/```json\n?|```\n?/g, "").trim()));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/chat
router.post("/chat", auth, async (req, res) => {
  try {
    const { messages, treeContext } = req.body;
    const members = (treeContext?.persons || []).map(p => `${p.nameEn}(${p.name})`).join(", ");
    const resp = await fetch(CLAUDE, { method: "POST", headers: headers(), body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 1000,
      system: `You are a Telugu family tree assistant for "${treeContext?.name}". Members: ${members}. Be concise and warm.`,
      messages,
    })});
    const data = await resp.json();
    res.json({ reply: data.content?.find(c => c.type === "text")?.text || "Sorry, could not respond." });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
