// routes/ai.js  — Secure proxy to Anthropic Claude API
const router = require("express").Router();
const auth   = require("../middleware/auth");

const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
const HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": process.env.ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
};

// POST /api/ai/extract  — extract family tree from image
router.post("/extract", auth, async (req, res) => {
  const { imageBase64, mediaType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "Image required" });

  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } },
        { type: "text", text: `Analyze this Telugu genealogy document. Extract all family members and parent-child relationships.
Return ONLY valid JSON (no explanation, no markdown):
{"title":"Telugu family name","titleEn":"English family name","persons":[{"id":"p1","name":"Telugu name","nameEn":"English romanization","education":"degree if any"}],"relationships":[{"parentId":"p1","childId":"p2"}]}
Rules: Sequential IDs (p1,p2,p3…), romanize Telugu names for nameEn, include education/qualifications if mentioned, first person should be the oldest ancestor.` }
      ]
    }]
  };

  try {
    const resp = await fetch(CLAUDE_URL, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
    const data = await resp.json();
    const text = data.content?.find(c => c.type === "text")?.text || "{}";
    const clean = text.replace(/```json\n?|```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    res.status(500).json({ error: "AI extraction failed", detail: e.message });
  }
});

// POST /api/ai/chat  — conversational AI about the family tree
router.post("/chat", auth, async (req, res) => {
  const { messages, treeContext } = req.body;
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: `You are a helpful Telugu family tree assistant. Current tree: "${treeContext?.name}".
Members: ${(treeContext?.persons || []).map(p => `${p.nameEn}(${p.name})`).join(", ")}.
Be concise and friendly. Respond in English and Telugu when helpful.`,
    messages,
  };

  try {
    const resp = await fetch(CLAUDE_URL, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
    const data = await resp.json();
    res.json({ reply: data.content?.find(c => c.type === "text")?.text || "Sorry, could not respond." });
  } catch (e) {
    res.status(500).json({ error: "AI chat failed" });
  }
});

module.exports = router;
