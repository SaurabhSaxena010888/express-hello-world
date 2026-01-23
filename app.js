const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const OpenAI = require("openai");
const {
  RtcTokenBuilder,
  RtcRole
} = require("agora-access-token");

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
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* =====================
   AUDIO ACTIVITY (LISTENING)
===================== */
app.post("/audio-chunk", (req, res) => {
  console.log("🎧 Aira listening", req.body);
  res.json({ success: true });
});

/* =====================
   SPEECH → TEXT
===================== */
app.post(
  "/speech-to-text",
  upload.single("audio"),
  async (req, res) => {
    try {
      const audioPath = req.file.path;

      const transcription =
        await openai.audio.transcriptions.create({
          file: fs.createReadStream(audioPath),
          model: "gpt-4o-transcribe",
        });

      fs.unlinkSync(audioPath);

      console.log("🗣️ User said:", transcription.text);

      res.json({
        success: true,
        text: transcription.text,
      });
    } catch (err) {
      console.error("STT error:", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

/* =====================
   START SERVER
===================== */
app.listen(PORT, () => {
  console.log(`Aira backend running on port ${PORT}`);
});
