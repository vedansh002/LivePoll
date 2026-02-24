/**
 * Room Manager - MongoDB version with async/await
 * 
 * Handles all database operations for quiz rooms using Mongoose
 */

import Room from './models/Room.js';

class RoomManager {

  /**
   * Generate unique room code (6 chars, alphanumeric)
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Generate unique room ID
   */
  generateRoomId() {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new room in database
   */
  async createRoom(teacherSocketId, teacherName = 'Teacher') {
    try {
      const roomId = this.generateRoomId();
      const roomCode = this.generateRoomCode();

      const room = new Room({
        roomId,
        roomCode,
        teacher: teacherSocketId,
        teacherName,
        students: new Map(),
        questions: [],
        currentQuestionIndex: -1,
        quizStarted: false,
        status: 'active'
      });

      await room.save();
      console.log(`[DB] Room created: ${roomId} (Code: ${roomCode})`);

      return { roomId, roomCode };
    } catch (error) {
      console.error('[DB] Error creating room:', error);
      throw error;
    }
  }

  /**
   * Find room by room code
   */
  async findRoomByCode(roomCode) {
    try {
      const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
      return room;
    } catch (error) {
      console.error('[DB] Error finding room by code:', error);
      return null;
    }
  }

  /**
   * Get room by ID
   */
  async getRoom(roomId) {
    try {
      const room = await Room.findOne({ roomId });
      return room;
    } catch (error) {
      console.error('[DB] Error getting room:', error);
      return null;
    }
  }

  /**
   * Add student to room
   */
  async addStudent(roomId, socketId, studentName) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return false;

      // Add student to Map
      room.students.set(socketId, {
        socketId,
        name: studentName,
        score: 0,
        hasAnswered: false,
        answer: null
      });

      await room.save();
      console.log(`[DB] Student ${studentName} added to room ${roomId}`);
      return true;
    } catch (error) {
      console.error('[DB] Error adding student:', error);
      return false;
    }
  }

  /**
   * Remove student from room
   */
  async removeStudent(roomId, socketId) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return false;

      room.students.delete(socketId);
      await room.save();

      // If teacher disconnects, mark room as offline
      if (room.teacher === socketId) {
        room.status = 'offline';
        await room.save();
        console.log(`[DB] Teacher disconnected - room ${roomId} marked offline`);
        return 'room_offline';
      }

      console.log(`[DB] Student removed from room ${roomId}`);
      return true;
    } catch (error) {
      console.error('[DB] Error removing student:', error);
      return false;
    }
  }

  /**
   * Set quiz questions
   */
  async setQuestions(roomId, questions) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return false;

      room.questions = questions;
      room.currentQuestionIndex = -1;
      await room.save();

      console.log(`[DB] Questions set for room ${roomId}: ${questions.length} questions`);
      return true;
    } catch (error) {
      console.error('[DB] Error setting questions:', error);
      return false;
    }
  }

  /**
   * Start quiz
   */
  async startQuiz(roomId) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return false;

      room.quizStarted = true;

      // Reset all students' answers
      for (let [key, student] of room.students) {
        student.hasAnswered = false;
        student.answer = null;
      }

      await room.save();
      console.log(`[DB] Quiz started in room ${roomId}`);
      return true;
    } catch (error) {
      console.error('[DB] Error starting quiz:', error);
      return false;
    }
  }

  /**
   * Move to next question
   */
  async nextQuestion(roomId) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return false;

      room.currentQuestionIndex++;

      // Reset all students' answers for new question
      for (let [key, student] of room.students) {
        student.hasAnswered = false;
        student.answer = null;
      }

      await room.save();
      console.log(`[DB] Moved to question ${room.currentQuestionIndex + 1} in room ${roomId}`);
      return true;
    } catch (error) {
      console.error('[DB] Error moving to next question:', error);
      return false;
    }
  }

  /**
   * Submit answer - with race condition safety
   */
  async submitAnswer(roomId, socketId, answer) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return { success: false, message: 'Room not found' };

      const student = room.students.get(socketId);
      if (!student) return { success: false, message: 'Student not found' };

      // Prevent double submissions
      if (student.hasAnswered) {
        return { success: false, message: 'Already submitted' };
      }

      student.answer = answer;
      student.hasAnswered = true;

      // Check if answer is correct
      const question = room.questions[room.currentQuestionIndex];
      let correct = false;

      if (question && question.correctAnswer === answer) {
        student.score += 10;
        correct = true;
      }

      await room.save();

      console.log(`[DB] Answer submitted in room ${roomId}: ${student.name} (Correct: ${correct})`);

      return { success: true, correct, newScore: student.score };
    } catch (error) {
      console.error('[DB] Error submitting answer:', error);
      return { success: false, message: 'Database error' };
    }
  }

  /**
   * Get leaderboard (sorted by score descending)
   */
  async getLeaderboard(roomId) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return [];

      const leaderboard = Array.from(room.students.values())
        .map(student => ({
          name: student.name,
          score: student.score,
          socketId: student.socketId
        }))
        .sort((a, b) => b.score - a.score);

      return leaderboard;
    } catch (error) {
      console.error('[DB] Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * Get current question
   */
  async getCurrentQuestion(roomId) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room || room.currentQuestionIndex < 0) return null;

      return room.questions[room.currentQuestionIndex] || null;
    } catch (error) {
      console.error('[DB] Error getting current question:', error);
      return null;
    }
  }

  /**
   * Check if student has answered current question
   */
  async hasStudentAnswered(roomId, socketId) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return false;

      const student = room.students.get(socketId);
      return student ? student.hasAnswered : false;
    } catch (error) {
      console.error('[DB] Error checking if student answered:', error);
      return false;
    }
  }

  /**
   * Get all students in room
   */
  async getStudents(roomId) {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return [];

      return Array.from(room.students.values());
    } catch (error) {
      console.error('[DB] Error getting students:', error);
      return [];
    }
  }

  /**
   * Get all active rooms (for debugging)
   */
  async getAllRooms() {
    try {
      const rooms = await Room.find({ status: 'active' });
      return rooms;
    } catch (error) {
      console.error('[DB] Error getting all rooms:', error);
      return [];
    }
  }

  /**
   * Delete a room (cleanup after quiz ends)
   */
  async deleteRoom(roomId) {
    try {
      await Room.deleteOne({ roomId });
      console.log(`[DB] Room ${roomId} deleted`);
      return true;
    } catch (error) {
      console.error('[DB] Error deleting room:', error);
      return false;
    }
  }
}

export default new RoomManager();
