import express from "express";
import fetch from "node-fetch";
import cors from "cors";

/**
 * ===================================================
 * AIRA BACKEND — STEPS 1 to 8 (FINAL CONSOLIDATION)
 * =====================================================
 *
 * Backend OWNS:
 * - Call lifecycle truth
 * - Recording ownership
 * - Transcript & post-call intelligence
 * - Readiness assessment
 * - History & memory (2-year retention)
 *
 * Frontend requests actions.
 * Backend decides, executes, stores, and remembers.
 * =====================================================
 */

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Safe debug log
console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);

// ----------------------------------------------------
// 🔹 STEP 1: Backend Policies & Ownership
// ----------------------------------------------------

const BACKEND_CONFIG = {
  HISTORY_RETENTION_DAYS: 730, // 2 years
  MAX_CALL_DURATION_MINUTES: 90,
};

const CALL_STATUS = Object.freeze({
  CREATED: "created",
  ENDED: "ended",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
});

// Temporary in-memory registry (replace with DB later)
const activeSessions = new Map();
/*
conversationId => {
  userId,
  intent,
  status,
  startedAt,
  endedAt,
  recording,
  transcript,
  summary,
  readiness
}
*/

function assertBackendOwnership(condition, message) {
  if (!condition) {
    throw new Error(`Backend ownership violation: ${message}`);
  }
}

// ----------------------------------------------------
// 🔹 Health & Debug
// ----------------------------------------------------

app.get("/", (req, res) => {
  res.send("Aira backend running");
});

app.get("/debug", (req, res) => {
  res.json({
    status: "ok",
    routes: [
      "POST /openai-realtime-token",
      "POST /call/start",
      "POST /call/end",
      "POST /call/finalize",
      "POST /call/upload-audio",
      "POST /call/transcript",
      "POST /call/analyze",
      "GET  /history/:userId",
    ],
  });
});

// ----------------------------------------------------
// 🔹 OPENAI REALTIME SESSION (UNCHANGED CORE)
// ----------------------------------------------------

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

Your voice is delivered using the “alloy” voice, but your speaking style, tone, and language must reflect an original Indian female presence.

--------------------------------
VOICE & DELIVERY
--------------------------------
- Speak in Indian English with a neutral, urban accent
- Maintain a warm, confident, and composed tone
- Speak at a steady, unhurried pace
- Sound thoughtful, attentive, and grounded
- Avoid sounding robotic, rushed, theatrical, or overly cheerful

--------------------------------
LANGUAGE STYLE (IMPORTANT)
--------------------------------
- You may naturally use light Hindi or Hinglish when appropriate
- Use feminine self-references where linguistically natural, such as:
  - “main yeh suggest karti hoon”
  - “main yahan thoda clarify karti hoon”
  - “jo main samajh pa rahi hoon…”
- Do not overuse Hindi or Hinglish
- Keep the language professional, respectful, and easy to understand

--------------------------------
HUMAN-LIKE CONVERSATION
--------------------------------
- Speak naturally, with brief pauses as if thinking
- Occasionally use light, natural fillers such as:
  “hmm”, “okay”, “I see”, “theek hai”, “let me think for a moment”
- Use fillers sparingly and never repeatedly
- Always sound present and attentive

--------------------------------
CONVERSATION BEHAVIOR
--------------------------------
- Always acknowledge what the user has said before moving forward
- Ask one clear, meaningful question at a time
- Guide the conversation in a structured, calm manner
- Help the user organize thoughts and see the way forward

--------------------------------
BOUNDARIES (NON-NEGOTIABLE)
--------------------------------
- Never diagnose emotions, mental states, or psychological conditions
- Never claim to detect emotions, intentions, or tone scientifically
- Do not present yourself as a therapist, doctor, or human
- Avoid exaggerated empathy or dramatic reassurance
- Remain clearly an AI assistant at all times

--------------------------------
FOCUS & CLOSURE
--------------------------------
- Focus on clarity, structure, and practical next steps
- When ending a conversation, offer a calm, concise summary
- Leave the user feeling clearer, more confident, and not rushed

--------------------------------
CORE PRINCIPLE
--------------------------------
Behave like a thoughtful, experienced Indian female guide —
calm, respectful, attentive, and professional —
while remaining clearly an AI assistant.
`,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error("OpenAI session failed");

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// 🔹 STEP 2: Start Call Session
// ----------------------------------------------------

app.post("/call/start", (req, res) => {
  try {
    const { userId, intent } = req.body;
    assertBackendOwnership(userId, "userId required");

    const conversationId = `conv_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    activeSessions.set(conversationId, {
      userId,
      intent: intent || "general_guidance",
      status: CALL_STATUS.CREATED,
      startedAt: new Date(),
      endedAt: null,
      recording: null,
      transcript: null,
      summary: null,
      readiness: null,
    });

    res.json({ success: true, conversationId });

  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ----------------------------------------------------
// 🔹 STEP 3: End Call Session
// ----------------------------------------------------

app.post("/call/end", (req, res) => {
  try {
    const { conversationId } = req.body;
    assertBackendOwnership(conversationId, "conversationId required");

    const session = activeSessions.get(conversationId);
    if (!session) throw new Error("Session not found");

    session.endedAt = new Date();
    session.status = CALL_STATUS.ENDED;

    res.json({
      success: true,
      durationSeconds: Math.floor(
        (session.endedAt - session.startedAt) / 1000
      ),
    });

  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ----------------------------------------------------
// 🔹 STEP 4: Finalize Call
// ----------------------------------------------------

app.post("/call/finalize", (req, res) => {
  try {
    const { conversationId, recordingMeta } = req.body;
    const session = activeSessions.get(conversationId);

    if (!session || session.status !== CALL_STATUS.ENDED)
      throw new Error("Call not ready to finalize");

    session.recording = {
      meta: recordingMeta || {},
      finalizedAt: new Date(),
    };

    session.status = CALL_STATUS.PROCESSING;

    res.json({ success: true });

  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ----------------------------------------------------
// 🔹 STEP 5: Upload Audio Reference
// ----------------------------------------------------

app.post("/call/upload-audio", (req, res) => {
  try {
    const { conversationId, audioUrl } = req.body;
    const session = activeSessions.get(conversationId);
    if (!session) throw new Error("Session not found");

    session.recording.audioUrl = audioUrl;
    res.json({ success: true });

  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ----------------------------------------------------
// 🔹 STEP 6: Store Transcript
// ----------------------------------------------------

app.post("/call/transcript", (req, res) => {
  try {
    const { conversationId, transcriptText } = req.body;
    const session = activeSessions.get(conversationId);
    if (!session) throw new Error("Session not found");

    session.transcript = transcriptText;
    res.json({ success: true });

  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ----------------------------------------------------
// 🔹 STEP 7: Post-Call Analysis
// ----------------------------------------------------

app.post("/call/analyze", (req, res) => {
  try {
    const { conversationId, summary, readiness } = req.body;
    const session = activeSessions.get(conversationId);

    if (!session || !session.transcript)
      throw new Error("Transcript required");

    session.summary = summary;
    session.readiness = readiness;
    session.status = CALL_STATUS.COMPLETED;

    res.json({ success: true });

  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ----------------------------------------------------
// 🔹 STEP 8: History Retrieval (2 Years)
// ----------------------------------------------------

app.get("/history/:userId", (req, res) => {
  const { userId } = req.params;

  const history = Array.from(activeSessions.values())
    .filter(
      (s) => s.userId === userId && s.status === CALL_STATUS.COMPLETED
    )
    .map((s) => ({
      intent: s.intent,
      startedAt: s.startedAt,
      summary: s.summary,
      readiness: s.readiness,
      recording: s.recording?.audioUrl || null,
    }));

  res.json({ history });
});

// ----------------------------------------------------
// 🔹 Start Server
// ----------------------------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Aira backend running on port ${PORT}`);
});
