/*************************************************
 * Aira Backend – Voice + AI
 *************************************************/
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const OpenAI = require("openai");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

/* =====================
   APP SETUP
===================== */
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

/* =====================
   ENV VARIABLES
===================== */
const PORT = process.env.PORT || 10000;
const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/* =====================
   OPENAI CLIENT (ONCE)
===================== */
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/* =====================
   HEALTH CHECK
===================== */
app.get("/", (req, res) => {
  res.send("Aira backend is running 🚀");
});

/* =====================
   AGORA TOKEN
===================== */
app.get("/agora-token", (req, res) => {
  try {
    const channelName = req.query.channel;
    const uid = req.query.uid || 0;

    if (!channelName) {
      return res.status(400).json({
        success: false,
        error: "channel parameter is required",
      });
    }

    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpireTime =
      currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpireTime
    );

    res.json({
      success: true,
      appId: AGORA_APP_ID,
      token,
      channel: channelName,
      uid,
    });
  } catch (err) {
    console.error("Agora token error:", err);
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
  try {
    console.log("🎤 Raw audio received:", req.file.mimetype);

    const inputPath = req.file.path;
    const outputPath = `${inputPath}.wav`;

    // 🔁 Convert WebM → WAV (16kHz mono)
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFrequency(16000)
        .audioChannels(1)
        .audioCodec("pcm_s16le")
        .format("wav")
        .save(outputPath)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("✅ Converted to WAV");

    // 🧠 Send WAV to OpenAI
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(outputPath),
      model: "gpt-4o-transcribe",
    });

    console.log("🗣️ Transcription:", transcription.text);

    // 🤖 Aira response
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Aira, a calm, professional AI career and workplace mentor.",
        },
        {
          role: "user",
          content: transcription.text,
        },
      ],
    });

    const reply = aiResponse.choices[0].message.content;

    console.log("🤖 Aira replied:", reply);

    // 🧹 Cleanup
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    res.json({
      success: true,
      userText: transcription.text,
      reply,
    });
  } catch (err) {
    console.error("❌ STT error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================
   START SERVER
===================== */
app.listen(PORT, () => {
  console.log(`✅ Aira backend running on port ${PORT}`);
});
