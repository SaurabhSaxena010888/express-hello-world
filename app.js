import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Debug logs (safe – do NOT log actual key)
console.log("RETELL_API_KEY exists:", !!process.env.RETELL_API_KEY);
console.log("RETELL_AGENT_ID exists:", !!process.env.RETELL_AGENT_ID);

// 🔹 Health check
app.get("/", (req, res) => {
  res.send("Aira backend running");
});

// 🔹 Endpoint for frontend to start Retell web call
app.post("/createRetellSession", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.retellai.com/v2/create-web-call",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RETELL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: process.env.RETELL_AGENT_ID,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json(data);
    }

    // ✅ Return ONLY what frontend needs
    res.json({
      access_token: data.access_token,
      call_id: data.call_id, // optional but useful for logs
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔹 Render provides PORT automatically
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
