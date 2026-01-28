import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.get("/debug", (req, res) => {
  res.json({
    status: "ok",
    routes: ["GET /", "POST /createRetellSession"]
  });
});

// 🔹 Safe debug log (do NOT log actual key)
console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);

// 🔹 Health check
app.get("/", (req, res) => {
  res.send("Aira backend running");
});

// 🔹 Create OpenAI Realtime session (ephemeral token)
app.post("/openai-realtime-token", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview",
          voice: "alloy",
          instructions:
            "You are Aira, a calm, professional AI assistant. Speak clearly and naturally.",
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

    // ✅ Return ephemeral client secret ONLY
    res.json(data);

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔹 Render provides PORT automatically
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
