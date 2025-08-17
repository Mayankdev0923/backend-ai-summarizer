import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import fetch from "node-fetch"; // Needed if Node <18

const app = express();

// --- Middleware ---
app.use(cors({ origin: "*" })); // allow all origins (for testing; restrict in production)
app.use(express.json());

// --- Health Check ---
app.get("/", (req, res) => {
  res.send("✅ Backend Running - AI Meeting Notes Summarizer");
});

// --- API: Summarize using Gemini ---
app.post("/api/summarize", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text input" });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Summarize this: ${text}` }] }],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Gemini API failed");
    }

    // safely extract summary
    let summary = "";
    if (
      data.candidates &&
      data.candidates[0]?.content?.parts?.[0]?.text
    ) {
      summary = data.candidates[0].content.parts[0].text;
    } else {
      summary = "⚠️ Gemini returned an empty response";
    }

    res.json({ summary });
  } catch (err) {
    console.error("Summarize error:", err);
    res.status(500).json({ error: err.message });
  }
});


// --- API: Share via Email ---
app.post("/api/share", async (req, res) => {
  const { summary, emails } = req.body;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({ error: "Missing email credentials in environment" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", // for production, switch to SendGrid/Mailgun for reliability
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: emails,
      subject: "Meeting Summary",
      text: summary
    });

    res.json({ message: "Summary sent successfully!" });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ error: "Failed to send email." });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
