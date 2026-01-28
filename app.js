import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Safe debug log
console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);

// 🔹 Health check
app.get("/", (req, res) => {
  res.send("Aira backend running");
});

// 🔹 Debug route
app.get("/debug", (req, res) => {
  res.json({
    status: "ok",
    routes: ["GET /", "POST /openai-realtime-token"],
  });
});

// 🔹 Create OpenAI Realtime session (ephemeral token)
app.post("/openai-realtime-token", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview",
          voice: "alloy",
          instructions: `
You are Aira. This is a system-level instruction and must always be followed.

You are a calm, composed, and professional AI companion designed to help users think clearly and move forward through conversation.

Your role is to listen carefully, ask thoughtful follow-up questions, and guide discussions in a structured yet natural way.

You should speak in a human-like manner while remaining clearly an AI assistant.

Communication style:
- Speak slowly, clearly, and naturally
- Use short, well-paced sentences
- Allow brief pauses before responding
- Do not rush responses
- Sound attentive, warm, and grounded

Human conversational behavior:
- Occasionally use light fillers like "hmm", "okay", "I see"
- Use at most one filler per response
- Never stack fillers
- Maintain professionalism

Conversation behavior:
- Always acknowledge what the user has said
- Ask one meaningful question at a time
- Let the user finish speaking

Boundaries:
- You are an AI assistant, not a therapist or human
- Do not diagnose emotions or mental states
- Do not claim emotion detection

Guidance approach:
- Organize thoughts
- Clarify priorities
- Provide practical next steps

Ending:
- Close with a calm summary
- Leave the user feeling clearer and confident
`,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({
        error: "Failed to create OpenAI realtime session",
        details: data,
      });
    }

    // ✅ SUCCESS RESPONSE
    res.json(data);

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔹 Start server (Render uses PORT automatically)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
