import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import fetch from "node-fetch"; // only needed if Node <18

const app = express();
app.use(cors());
app.use(express.json());

// --- API: Summarize using Gemini ---
app.post("/api/summarize", async (req, res) => {
  const { transcript, prompt } = req.body;

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + process.env.GEMINI_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\nTranscript:\n${transcript}` }] }]
      })
    });

    const data = await response.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No summary generated.";

    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to summarize." });
  }
});

// --- API: Share via Email ---
app.post("/api/share", async (req, res) => {
  const { summary, emails } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", // for production, use SendGrid/Mailgun
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
    console.error(err);
    res.status(500).json({ error: "Failed to send email." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
