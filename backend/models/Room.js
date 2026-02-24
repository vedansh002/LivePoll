/**
 * Room Model
 * Mongoose schema for storing quiz rooms with embedded questions and students
 */

import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    socketId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      default: 0
    },
    hasAnswered: {
      type: Boolean,
      default: false
    },
    answer: {
      type: Number,
      default: null
    }
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    id: Number,
    text: String,
    options: [String],
    correctAnswer: Number,
    timeLimit: Number
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    roomCode: {
      type: String,
      unique: true,
      required: true,
      index: true,
      uppercase: true
    },
    teacher: {
      type: String,
      required: true
    },
    teacherName: {
      type: String,
      required: true
    },
    students: {
      type: Map,
      of: studentSchema,
      default: new Map()
    },
    questions: [questionSchema],
    currentQuestionIndex: {
      type: Number,
      default: -1
    },
    quizStarted: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['active', 'offline'],
      default: 'active'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Middleware to update timestamps
roomSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Room = mongoose.model('Room', roomSchema);

export default Room;
