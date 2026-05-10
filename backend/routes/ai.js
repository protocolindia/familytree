// routes/ai.js
const router  = require("express").Router();
const auth    = require("../middleware/auth");

const CLAUDE  = "https://api.anthropic.com/v1/messages";
const headers = () => ({
  "Content-Type": "application/json",
  "x-api-key": process.env.ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
});

// POST /api/ai/translate — translate English name to Telugu
router.post("/translate", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.json({ translation: "" });
    const resp = await fetch(CLAUDE, {
      method: "POST", headers: headers(),
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 100,
        messages: [{ role: "user", content: `Transliterate this English name to Telugu script only. Return ONLY the Telugu script text, nothing else, no explanation:\n"${text}"` }]
      })
    });
    const data = await resp.json();
    const translation = data.content?.find(c => c.type === "text")?.text?.trim() || "";
    res.json({ translation });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/extract — extract family tree from IMAGE or PDF
router.post("/extract", auth, async (req, res) => {
  try {
    const { imageBase64, mediaType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "File data required" });

    const isPdf = mediaType === "application/pdf";
    const contentBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: imageBase64 } }
      : { type: "image",    source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } };

    const resp = await fetch(CLAUDE, {
      method: "POST", headers: headers(),
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [{ role: "user", content: [
          contentBlock,
          { type: "text", text: `Analyze this Telugu genealogy document (image or PDF). Extract ALL family members and parent-child relationships visible.
Return ONLY valid JSON, no explanation, no markdown fences:
{"title":"Telugu family name","titleEn":"English family name","persons":[{"id":"p1","name":"Telugu name","nameEn":"English romanization","education":"degree if any","birth":"year if visible","death":"year if visible or null"}],"relationships":[{"parentId":"p1","childId":"p2"}]}
Rules:
- Sequential IDs (p1,p2,p3…)
- Romanize Telugu names for nameEn
- Include education/qualifications if mentioned
- First person in list should be the oldest ancestor
- Include ALL members visible in the document` }
        ]}]
      })
    });
    const data = await resp.json();
    const text = data.content?.find(c => c.type === "text")?.text || "{}";
    const clean = text.replace(/```json\n?|```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/chat — AI conversation about the tree
router.post("/chat", auth, async (req, res) => {
  try {
    const { messages, treeContext } = req.body;
    const members = (treeContext?.persons || []).map(p => `${p.nameEn}(${p.name})${p.education ? " [" + p.education + "]" : ""}`).join(", ");
    const resp = await fetch(CLAUDE, {
      method: "POST", headers: headers(),
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are a helpful Telugu family tree assistant for "${treeContext?.name}". Members: ${members}. Be concise, warm, and helpful. You can respond in Telugu and English.`,
        messages,
      })
    });
    const data = await resp.json();
    res.json({ reply: data.content?.find(c => c.type === "text")?.text || "Sorry, could not respond." });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
