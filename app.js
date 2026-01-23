/*************************************************
 * Aira Backend – Voice + AI (Production Ready)
 *************************************************/
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const OpenAI = require("openai");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

/* =====================
   HELPERS
===================== */
function splitForSpeech(text) {
  return text
    .replace(/\n/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 3); // 🔥 faster & more natural
}

/* =====================
   APP SETUP
===================== */
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "/tmp" });

/* =====================
   ENV VARIABLES
===================== */
const PORT = process.env.PORT || 10000;
const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/* =====================
   OPENAI CLIENT
===================== */
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/* =====================
   HEALTH CHECK
===================== */
app.get("/", (_, res) => {
  res.send("✅ Aira backend is running");
});

/* =====================
   AGORA TOKEN
===================== */
app.get("/agora-token", (req, res) => {
  try {
    const { channel } = req.query;
    const uid = req.query.uid || 0;

    if (!channel) {
      return res.status(400).json({ error: "channel required" });
    }

    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channel,
      uid,
      RtcRole.PUBLISHER,
      Math.floor(Date.now() / 1000) + 3600
    );

    res.json({ appId: AGORA_APP_ID, token, channel, uid });
  } catch (err) {
    console.error("Agora error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================
   AUDIO HEARTBEAT
===================== */
app.post("/audio-chunk", (req, res) => {
  console.log("🎧 Aira listening", req.body);
  res.json({ success: true });
});

/* =====================
   SPEECH → TEXT → AI
===================== */
app.post("/speech-to-text", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Audio file missing" });
  }

  const inputPath = req.file.path;
  const wavPath = `${inputPath}.wav`;

  try {
    console.log("🎤 Audio received:", req.file.mimetype);

    /* Convert to WAV */
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFrequency(16000)
        .audioChannels(1)
        .audioCodec("pcm_s16le")
        .format("wav")
        .save(wavPath)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("✅ Converted to WAV");

    /* Speech → Text */
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(wavPath),
      model: "gpt-4o-transcribe",
    });

    console.log("🗣️ Transcription:", transcription.text);

    /* AI Response */
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are Aira, a warm, confident, human-like AI assistant.
Speak naturally and conversationally.
Use short sentences.
Pause naturally.
Avoid long explanations.
`,
        },
        { role: "user", content: transcription.text },
      ],
    });

    const reply = completion.choices[0].message.content;
    const speechChunks = splitForSpeech(reply);

    console.log("🤖 Aira replied:", reply);

    res.json({
      success: true,
      userText: transcription.text,
      reply,
      speechChunks,
    });
  } catch (err) {
    console.error("❌ STT error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    try {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(wavPath);
    } catch {}
  }
});

/* =====================
   TEXT → SPEECH
===================== */
app.post("/text-to-speech", async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text required" });
  }

  try {
    console.log("🗣️ Aira speaking:", text);

    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    res.set("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (err) {
    console.error("❌ TTS error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================
   START SERVER
===================== */
app.listen(PORT, () => {
  console.log(`🚀 Aira backend running on port ${PORT}`);
});
