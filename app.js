const express = require("express");
const admin = require("firebase-admin");
const OpenAI = require("openai");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;


/* ===================== FIREBASE INIT ===================== */
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/* ===================== OPENAI INIT ===================== */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ===================== APP SETUP ===================== */
const app = express();
const port = process.env.PORT || 3001;

/* ===================== ROUTES ===================== */

// Home route (Render default page)
app.get("/", (req, res) => res.type("html").send(html));

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
    console.error("Firebase test error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* 🧠 Aira – OpenAI thinking test */

app.get("/aira-test", async (req, res) => {
  try {
    const userInput =
      req.query.q || "I feel stuck in my career. What should I do?";

    const completion = await openai.chat.completions.create({
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
      response: completion.choices[0].message.content,
    });
  } catch (err) {
    console.error("Aira test error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
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
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* ===================== SERVER ===================== */
const server = app.listen(port, () =>
  console.log(`Server running on port ${port}`)
);

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;

/* ===================== HTML ===================== */
const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Hello from Render!</title>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js"></script>
    <script>
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          disableForReducedMotion: true
        });
      }, 500);
    </script>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: white;
      }
      section {
        border-radius: 1em;
        padding: 1em;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
    </style>
  </head>
  <body>
    <section>
      Hello from Render!
    </section>
  </body>
</html>
`;
