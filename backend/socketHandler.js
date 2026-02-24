/**
 * Socket Handler - Manages all WebSocket events (Async/Await for MongoDB)
 * 
 * Events flow:
 * 1. Teacher: create_room -> generate roomId + roomCode
 * 2. Student: join_room (with roomCode) -> added to room
 * 3. Teacher: start_quiz (with questions) -> quiz begins
 * 4. Teacher: send_question -> broadcast question to all
 * 5. Student: submit_answer -> validate, update score, broadcast leaderboard
 * 6. Teacher: next_question -> move to next q, reset answers
 * 7. disconnect -> cleanup (mark offline instead of deleting)
 */

import roomManager from './roomManager.js';

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // ============ ROOM CREATION ============
    socket.on('create_room', async (data, callback) => {
      try {
        const { teacherName = 'Teacher' } = data || {};
        const { roomId, roomCode } = await roomManager.createRoom(socket.id, teacherName);

        // Join teacher to a socket room
        socket.join(roomId);
        socket.userRole = 'teacher';
        socket.roomId = roomId;

        console.log(`[Teacher] Created room: ${roomId} (Code: ${roomCode})`);

        if (typeof callback === 'function') {
          callback({
            success: true,
            roomId,
            roomCode
          });
        }
      } catch (error) {
        console.error('[Error] create_room:', error);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Failed to create room' });
        }
      }
    });

    // ============ STUDENT JOIN ============
    socket.on('join_room', async (data, callback) => {
      try {
        const { roomCode, studentName } = data;

        if (!roomCode || !studentName) {
          if (typeof callback === 'function') callback({ success: false, message: 'Missing roomCode or studentName' });
          return;
        }

        // Find room by code
        const room = await roomManager.findRoomByCode(roomCode);
        if (!room) {
          if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
          return;
        }

        const roomId = room.roomId;

        // Add student to room
        const added = await roomManager.addStudent(roomId, socket.id, studentName);
        if (!added) {
          if (typeof callback === 'function') callback({ success: false, message: 'Failed to join room' });
          return;
        }

        // Join socket to room
        socket.join(roomId);
        socket.userRole = 'student';
        socket.roomId = roomId;

        console.log(`[Student] ${studentName} joined room ${roomId}`);

        // Notify all in room that student joined
        const leaderboard = await roomManager.getLeaderboard(roomId);
        io.to(roomId).emit('student_joined', {
          studentName,
          leaderboard
        });

        if (typeof callback === 'function') {
          callback({
            success: true,
            roomId,
            leaderboard,
            quizStarted: room.quizStarted
          });
        }
      } catch (error) {
        console.error('[Error] join_room:', error);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Failed to join room' });
        }
      }
    });

    // ============ START QUIZ ============
    socket.on('start_quiz', async (data, callback) => {
      try {
        const roomId = socket.roomId;
        if (!roomId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Not in a room' });
          return;
        }

        const room = await roomManager.getRoom(roomId);
        if (!room || room.teacher !== socket.id) {
          if (typeof callback === 'function') callback({ success: false, message: 'Only teacher can start quiz' });
          return;
        }

        const { questions } = data;
        if (!questions || questions.length === 0) {
          if (typeof callback === 'function') callback({ success: false, message: 'No questions provided' });
          return;
        }

        // Set questions and start quiz
        await roomManager.setQuestions(roomId, questions);
        await roomManager.startQuiz(roomId);

        console.log(`[Quiz] Started in room ${roomId} with ${questions.length} questions`);

        io.to(roomId).emit('quiz_started', {
          totalQuestions: questions.length
        });

        if (typeof callback === 'function') {
          callback({ success: true });
        }
      } catch (error) {
        console.error('[Error] start_quiz:', error);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Failed to start quiz' });
        }
      }
    });

    // ============ SEND QUESTION ============
    socket.on('send_question', async (data, callback) => {
      try {
        const roomId = socket.roomId;
        if (!roomId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Not in a room' });
          return;
        }

        const room = await roomManager.getRoom(roomId);
        if (!room || room.teacher !== socket.id) {
          if (typeof callback === 'function') callback({ success: false, message: 'Only teacher can send questions' });
          return;
        }

        const { questionIndex } = data;
        const question = room.questions[questionIndex];

        if (!question) {
          if (typeof callback === 'function') callback({ success: false, message: 'Question not found' });
          return;
        }

        // Update question index in database
        await roomManager.nextQuestion(roomId);

        // Broadcast question to all students (without correct answer)
        io.to(roomId).emit('question_sent', {
          questionIndex: questionIndex + 1,
          totalQuestions: room.questions.length,
          text: question.text,
          options: question.options,
          timeLimit: question.timeLimit
        });

        console.log(`[Question] Q${questionIndex + 1} sent in room ${roomId}`);

        // Auto-advance timer if timeLimit is set
        if (question.timeLimit > 0) {
          const timer = setTimeout(async () => {
            const leaderboard = await roomManager.getLeaderboard(roomId);
            io.to(roomId).emit('time_up', {
              correctAnswer: question.correctAnswer,
              leaderboard
            });
          }, question.timeLimit * 1000);
        }

        if (typeof callback === 'function') {
          callback({ success: true });
        }
      } catch (error) {
        console.error('[Error] send_question:', error);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Failed to send question' });
        }
      }
    });

    // ============ SUBMIT ANSWER ============
    socket.on('submit_answer', async (data, callback) => {
      try {
        const roomId = socket.roomId;
        if (!roomId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Not in a room' });
          return;
        }

        const { answer } = data;
        if (answer === undefined || answer === null) {
          if (typeof callback === 'function') callback({ success: false, message: 'Invalid answer' });
          return;
        }

        // Submit answer (handles double-submission prevention)
        const result = await roomManager.submitAnswer(roomId, socket.id, answer);
        if (!result.success) {
          if (typeof callback === 'function') callback({ success: false, message: result.message });
          return;
        }

        const room = await roomManager.getRoom(roomId);
        const student = room.students.get(socket.id);

        console.log(`[Answer] ${student.name} answered Q${room.currentQuestionIndex + 1} (Correct: ${result.correct})`);

        // Broadcast leaderboard update to all
        const leaderboard = await roomManager.getLeaderboard(roomId);
        io.to(roomId).emit('answer_submitted', {
          studentName: student.name,
          correct: result.correct,
          leaderboard
        });

        if (typeof callback === 'function') {
          callback({ success: true, correct: result.correct });
        }
      } catch (error) {
        console.error('[Error] submit_answer:', error);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Failed to submit answer' });
        }
      }
    });

    // ============ NEXT QUESTION ============
    socket.on('next_question', async (data, callback) => {
      try {
        const roomId = socket.roomId;
        if (!roomId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Not in a room' });
          return;
        }

        const room = await roomManager.getRoom(roomId);
        if (!room || room.teacher !== socket.id) {
          if (typeof callback === 'function') callback({ success: false, message: 'Only teacher can advance' });
          return;
        }

        const question = await roomManager.getCurrentQuestion(roomId);
        if (question) {
          // Show correct answer before moving on
          const leaderboard = await roomManager.getLeaderboard(roomId);
          io.to(roomId).emit('show_answer', {
            correctAnswer: question.correctAnswer,
            leaderboard
          });
        }

        if (typeof callback === 'function') {
          callback({ success: true });
        }
      } catch (error) {
        console.error('[Error] next_question:', error);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Failed to advance question' });
        }
      }
    });

    // ============ DISCONNECT ============
    socket.on('disconnect', async () => {
      const roomId = socket.roomId;

      if (roomId) {
        const room = await roomManager.getRoom(roomId);

        if (socket.userRole === 'teacher') {
          console.log(`[Teacher] Disconnected - marking room ${roomId} as offline`);
          const result = await roomManager.removeStudent(roomId, socket.id);
          // Notify all students that room is offline
          io.to(roomId).emit('room_closed', {
            message: 'Teacher disconnected. Quiz ended.'
          });
        } else if (socket.userRole === 'student') {
          const student = room?.students.get(socket.id);
          if (student) {
            console.log(`[Student] ${student.name} disconnected from room ${roomId}`);
            await roomManager.removeStudent(roomId, socket.id);
            // Notify others that student left
            const leaderboard = await roomManager.getLeaderboard(roomId);
            io.to(roomId).emit('student_left', {
              studentName: student.name,
              leaderboard
            });
          }
        }
      }

      console.log(`[Socket] User disconnected: ${socket.id}`);
    });
  });
}
