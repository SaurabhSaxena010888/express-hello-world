/*************************
 * IMPORTS
 *************************/
const express = require("express");
const admin = require("firebase-admin");
const OpenAI = require("openai");
const {
  RtcTokenBuilder,
  RtcRole,
} = require("agora-access-token");

/*************************
 * APP INIT
 *************************/
const app = express();
const port = process.env.PORT || 3001;

/*************************
 * 🔐 CORS (MUST BE FIRST)
 *************************/
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

/*************************
 * FIREBASE INIT
 *************************/
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/*************************
 * OPENAI INIT
 *************************/
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/*************************
 * AGORA CONFIG
 *************************/
const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE =
  process.env.AGORA_APP_CERTIFICATE;

/*************************
 * ROUTES
 *************************/

/* 🏠 Home */
app.get("/", (req, res) => {
  res.send("Aira backend is running 🚀");
});

/* 🔥 Firebase connectivity test */
app.get("/firebase-test", async (req, res) => {
  try {
    const snapshot = await db
      .collection("questionnaires")
      .limit(1)
      .get();

    res.json({
      success: true,
      docsFound: snapshot.size,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* 🧠 Aira AI test */
app.get("/aira-test", async (req, res) => {
  try {
    const userInput =
      req.query.q ||
      "I feel stuck in my career. What should I do?";

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are Aira, a calm, wise AI companion. Be practical, supportive, and concise.",
          },
          {
            role: "user",
            content: userInput,
          },
        ],
      });

    res.json({
      success: true,
      response:
        completion.choices[0].message.content,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* 🎥 Agora token endpoint */
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
    const currentTimestamp = Math.floor(
      Date.now() / 1000
    );
    const privilegeExpireTime =
      currentTimestamp +
      expirationTimeInSeconds;

    const token =
      RtcTokenBuilder.buildTokenWithUid(
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
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
app.post("/audio-chunk", express.json(), (req, res) => {
  console.log("🎙️ Audio stream ping received");
  res.json({ success: true });
});

/*************************
 * START SERVER (LAST)
 *************************/
const server = app.listen(port, () => {
  console.log(`Aira backend running on port ${port}`);
});

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
