const express = require("express");
const admin = require("firebase-admin");

/* -------------------- FIREBASE INIT -------------------- */
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/* -------------------- APP SETUP -------------------- */
const app = express();
const port = process.env.PORT || 3001;

/* -------------------- ROUTES -------------------- */

// Home route (Render default page)
app.get("/", (req, res) => res.type("html").send(html));

// 🔥 Firebase connectivity test
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

/* -------------------- SERVER -------------------- */
const server = app.listen(port, () =>
  console.log(`Server running on port ${port}`)
);

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;

/* -------------------- HTML -------------------- */
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
      @import url("https://p.typekit.net/p.css?s=1&k=vnd5zic&ht=tk&f=39475.39476.39477.39478.39479.39480.39481.39482&a=18673890&app=typekit&e=css");
      @font-face {
        font-family: "neo-sans";
        src: url("https://use.typekit.net/af/00ac0a/00000000000000003b9b2033/27/l?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n7&v=3") format("woff2");
        font-style: normal;
        font-weight: 700;
      }
      html {
        font-family: neo-sans;
        font-weight: 700;
        font-size: calc(62rem / 16);
      }
      body {
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

