import { useState, useEffect } from 'react';
import '../styles/TeacherDashboard.css';

/**
 * TeacherDashboard Component
 * 
 * Teacher can:
 * - View room code and share with students
 * - See waiting students
 * - Upload/enter quiz questions
 * - Start quiz
 * - View leaderboard
 * - Manage quiz flow
 */

function TeacherDashboard({ socket, roomId, roomCode }) {
  const [students, setStudents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    timeLimit: 15
  });
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [leaderboard, setLeaderboard] = useState([]);
  const [rawText, setRawText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const handleGenerateAIQuiz = async () => {
    if (!rawText.trim()) return alert("Please paste some text first!");
    
    setIsGenerating(true);
    try {
      // Your terminal shows the backend is running on port 5000
      const response = await fetch('http://localhost:5000/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawText: rawText,
          educatorId: "teacher_123", // Replace with real auth ID later if needed
          title: "Auto-Generated Quiz"
        }),
      });

      if (!response.ok) throw new Error("Failed to generate quiz");

      const data = await response.json();

      // Translate the AI's data to match your specific frontend state structure
      const formattedQuestions = data.questions.map(q => ({
        text: q.questionText,
        options: q.options,
        // Find the index of the correct answer string to match your correctAnswer: 0 logic
        correctAnswer: q.options.indexOf(q.correctAnswer) !== -1 ? q.options.indexOf(q.correctAnswer) : 0,
        timeLimit: 15 
      }));

      // Add the new AI questions to your existing questions array
      setQuestions(prevQuestions => [...prevQuestions, ...formattedQuestions]);
      setRawText(''); // Clear the input field
      alert("AI Quiz added successfully!");

    } catch (error) {
      console.error("AI Generation Error:", error);
      alert("Something went wrong. Check the backend console.");
    } finally {
      setIsGenerating(false);
    }
  };
  useEffect(() => {
    // Listen for student joining
    socket.on('student_joined', ({ studentName, leaderboard: newLeaderboard }) => {
      console.log(`Student joined: ${studentName}`);
      setLeaderboard(newLeaderboard);
    });

    // Listen for quiz started
    socket.on('quiz_started', () => {
      setQuizStarted(true);
      setCurrentQuestionIndex(0);
    });

    // Listen for answer submitted
    socket.on('answer_submitted', ({ studentName, correct, leaderboard: newLeaderboard }) => {
      console.log(`${studentName} answered (Correct: ${correct})`);
      setLeaderboard(newLeaderboard);
    });

    // Listen for student left
    socket.on('student_left', ({ studentName, leaderboard: newLeaderboard }) => {
      console.log(`Student left: ${studentName}`);
      setLeaderboard(newLeaderboard);
    });

    return () => {
      socket.off('student_joined');
      socket.off('quiz_started');
      socket.off('answer_submitted');
      socket.off('student_left');
    };
  }, [socket]);

  const handleAddQuestion = () => {
    // Validate question
    if (!newQuestion.text.trim()) {
      alert('Please enter question text');
      return;
    }

    if (newQuestion.options.some(opt => !opt.trim())) {
      alert('Please fill all options');
      return;
    }

    setQuestions([...questions, { ...newQuestion }]);
    setNewQuestion({
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      timeLimit: 15
    });
  };

  const handleRemoveQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleStartQuiz = () => {
    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    socket.emit('start_quiz', { questions }, (response) => {
      if (response.success) {
        setQuizStarted(true);
        setCurrentQuestionIndex(0);
        // Automatically send first question
        setTimeout(() => {
          socket.emit('send_question', { questionIndex: 0 });
        }, 500);
      }
    });
  };

  const handleSendQuestion = (index) => {
    socket.emit('send_question', { questionIndex: index }, (response) => {
      if (response.success) {
        setCurrentQuestionIndex(index);
      }
    });
  };

  const handleNextQuestion = () => {
    socket.emit('next_question', {}, () => {
      if (currentQuestionIndex + 1 < questions.length) {
        setTimeout(() => {
          handleSendQuestion(currentQuestionIndex + 1);
        }, 1000);
      }
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomCode);
    alert('Room code copied to clipboard!');
  };

  return (
    <div className="teacher-dashboard">
      <div className="dashboard-header">
        <h1> TeacherDashboard</h1>
        <div className="room-info">
          <div className="room-code-box">
            <span>Room Code: <strong>{roomCode}</strong></span>
            <button className="btn-copy" onClick={copyToClipboard}>
              Copy
            </button>
          </div>
        </div>
      </div>
      <div className="ai-quiz-generator p-4 border rounded bg-gray-50 my-4">
  <h3 className="font-bold mb-2">Generate Questions with AI</h3>
  <textarea 
    className="w-full p-2 border rounded mb-2"
    rows="4"
    placeholder="Paste an article, paragraph, or lesson plan here..."
    value={rawText}
    onChange={(e) => setRawText(e.target.value)}
  />
  <button 
    onClick={handleGenerateAIQuiz}
    disabled={isGenerating}
    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
  >
    {isGenerating ? "Generating..." : "Auto-Generate 3 Questions"}
  </button>
</div>

      <div className="dashboard-grid">
        {/* LEFT: Question Management */}
        <div className="section questions-section">
          <h2>📋 Questions</h2>

          <div className="question-form">
            <div className="form-group">
              <label>Question Text</label>
              <textarea
                value={newQuestion.text}
                onChange={(e) =>
                  setNewQuestion({ ...newQuestion, text: e.target.value })
                }
                placeholder="Enter question"
                disabled={quizStarted}
              />
            </div>

            <div className="form-group">
              <label>Time Limit (seconds)</label>
              <input
                type="number"
                value={newQuestion.timeLimit}
                onChange={(e) =>
                  setNewQuestion({
                    ...newQuestion,
                    timeLimit: parseInt(e.target.value)
                  })
                }
                min="0"
                disabled={quizStarted}
              />
            </div>

            <div className="options-grid">
              {newQuestion.options.map((option, idx) => (
                <div key={idx} className="option-input">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...newQuestion.options];
                      newOptions[idx] = e.target.value;
                      setNewQuestion({
                        ...newQuestion,
                        options: newOptions
                      });
                    }}
                    placeholder={`Option ${idx + 1}`}
                    disabled={quizStarted}
                  />
                  <input
                    type="radio"
                    name="correct"
                    checked={newQuestion.correctAnswer === idx}
                    onChange={() =>
                      setNewQuestion({ ...newQuestion, correctAnswer: idx })
                    }
                    disabled={quizStarted}
                  />
                </div>
              ))}
            </div>

            <button
              className="btn btn-add"
              onClick={handleAddQuestion}
              disabled={quizStarted}
            >
              Add Question
            </button>
          </div>

          <div className="questions-list">
            {questions.map((q, idx) => (
              <div
                key={idx}
                className={`question-item ${
                  currentQuestionIndex === idx ? 'active' : ''
                }`}
              >
                <div>
                  <strong>Q{idx + 1}:</strong> {q.text}
                </div>
                <div className="question-actions">
                  {quizStarted && (
                    <button
                      className="btn btn-sm"
                      onClick={() => handleSendQuestion(idx)}
                    >
                      Send
                    </button>
                  )}
                  {!quizStarted && (
                    <button
                      className="btn btn-sm btn-delete"
                      onClick={() => handleRemoveQuestion(idx)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!quizStarted && (
            <button
              className="btn btn-primary"
              onClick={handleStartQuiz}
              disabled={questions.length === 0}
            >
              🎬 Start Quiz
            </button>
          )}
        </div>

        {/* RIGHT: Leaderboard */}
        <div className="section leaderboard-section">
          <h2>🏆 Leaderboard</h2>

          <div className="leaderboard">
            {leaderboard.length === 0 ? (
              <p className="empty-message">Waiting for students...</p>
            ) : (
              <div className="leaderboard-list">
                {leaderboard.map((student, idx) => (
                  <div key={student.socketId} className="leaderboard-item">
                    <div className="rank">#{idx + 1}</div>
                    <div className="name">{student.name}</div>
                    <div className="score">{student.score}pts</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {quizStarted && (
            <div className="quiz-controls">
              <p className="current-q">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
              <button
                className="btn btn-next"
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex >= questions.length - 1}
              >
                ➡️ Next Question
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard;
