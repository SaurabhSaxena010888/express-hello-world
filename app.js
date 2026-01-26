import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
console.log("RETELL_API_KEY exists:", !!process.env.RETELL_API_KEY);
console.log("RETELL_AGENT_ID:", process.env.RETELL_AGENT_ID);

// 🔹 Health check (optional but useful)
app.get("/", (req, res) => {
  res.send("Aira backend running");
});

// 🔹 THIS is the endpoint your UI will call
app.post("/createRetellSession", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.retellai.com/v1/web-call",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RETELL_API_KEY}`, // from Render
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          agent_id: process.env.RETELL_AGENT_ID // from Render
        })
      }
    );

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔹 Render provides PORT automatically
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}
);
