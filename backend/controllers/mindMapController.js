const { GoogleGenerativeAI } = require("@google/generative-ai");

// POST /api/mindmap/generate
exports.generateMindMap = async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res
        .status(400)
        .json({ status: "error", message: "Topic is required" });
    }

    // 1) Init Gemini client
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        status: "error",
        message: "GEMINI_API_KEY is not set in backend/.env",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
   const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 2) Prompt for a JSON mind map
    const prompt = `
Generate a hierarchical mind map in JSON format only.

Topic: "${topic}"

Return STRICTLY valid JSON with this shape:
{
  "root": "Topic name",
  "children": [
    {
      "name": "Subtopic 1",
      "children": [
        "Point A",
        "Point B"
      ]
    },
    {
      "name": "Subtopic 2",
      "children": []
    }
  ]
}

Do NOT include any explanation text, only JSON.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text(); // Gemini output as string

    let mapJson;
    try {
      mapJson = JSON.parse(text);
    } catch (e) {
      // In case Gemini wraps JSON in ```json ``` blocks etc.
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        mapJson = JSON.parse(match[0]);
      } else {
        throw new Error("Gemini did not return valid JSON: " + text);
      }
    }

    // 3) Respond to frontend with parsed JSON
    return res.json({
      status: "success",
      map: mapJson,
    });
  } catch (err) {
    console.error("Gemini MindMap Error:", err.message);
    return res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};
