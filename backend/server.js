/**
 * LivePoll Backend Server
 * 
 * Real-time classroom quiz platform
 * Uses Express + Socket.io for WebSocket communication
 * MongoDB for persistent data storage
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { setupSocketHandlers } from './socketHandler.js';
import Quiz from './models/Quiz.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// ============ MongoDB Connection ============
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/livepoll';
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log(' MongoDB connected');
  })
  .catch((err) => {
    console.error(' MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

// Setup socket handlers
setupSocketHandlers(io);
const router = express.Router();

// POST /api/generate-quiz
// POST /api/generate-quiz
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { rawText, educatorId, title } = req.body;

    if (!rawText) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const prompt = `You are a strict JSON API. Generate 3 multiple-choice questions based on the following text. 
    Return ONLY a valid JSON array of objects. Do not include any markdown formatting, conversational text, or backticks.
    Each object must have exactly these keys: "questionText" (string), "options" (array of 4 strings), and "correctAnswer" (string matching one of the options).
    
    Text: "${rawText}"`;

    // Calling the Gemini 1.5 Flash model
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }] 
        }),
      }
    );

    const aiData = await response.json();

    if (aiData.error) {
      throw new Error(`Gemini API error: ${aiData.error.message}`);
    }

    // Extracting the text from Gemini's response structure
    let generatedText = aiData.candidates[0].content.parts[0].text;

    // Sanitize output
    generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();

    const questionsArray = JSON.parse(generatedText);

    // Send it back to the React frontend
    res.status(201).json({
      message: 'Gemini Quiz generated successfully!',
      questions: questionsArray
    });

  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: 'Failed to generate quiz with Gemini.' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`\n🚀 LivePoll Backend running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
  console.log(`🗄️  MongoDB: ${MONGO_URI}\n`);
});
