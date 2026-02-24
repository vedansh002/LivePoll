import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  creatorId: { type: String, required: true },
  questions: [{
    questionText: String,
    options: [String],
    correctAnswer: String
  }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Quiz', quizSchema);