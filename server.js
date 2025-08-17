import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import fetch from "node-fetch"; // Needed if Node <18
import "dotenv/config"; // or: require("dotenv").config();

const app = express();

// --- Middleware ---
app.use(cors({ origin: "*" }));
app.use(express.json());

// --- Health Check ---
app.get("/", (req, res) => {
  res.send("✅ Backend Running - AI Meeting Notes Summarizer");
});

// --- API: Summarize using Gemini ---
app.post("/api/summarize", async (req, res) => {
  try {
    const { transcript, prompt } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: "Missing transcript input" });
    }

    // Merge transcript + prompt
    const inputText = prompt
      ? `${prompt}\n\nTranscript:\n${transcript}`
      : transcript;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: `Summarize this meeting:\n${inputText}` }] },
          ],
        }),
      }
    );

    const data = await response.json();
    console.log("🔎 Gemini raw response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(data.error?.message || "Gemini API failed");
    }

    let summary = "";
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      summary = data.candidates[0].content.parts[0].text;
    } else {
      summary = "⚠️ No summary generated";
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
    return res
      .status(500)
      .json({ error: "Missing email credentials in environment" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: emails,
      subject: "Meeting Summary",
      text: summary,
    });

    res.json({ message: "Summary sent successfully!" });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ error: "Failed to send email." });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
