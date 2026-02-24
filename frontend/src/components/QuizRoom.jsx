import { useState, useEffect } from 'react';
import '../styles/QuizRoom.css';

/**
 * QuizRoom Component
 * 
 * Shared component for both Teacher and Student
 * 
 * Shows:
 * - Current question and options
 * - Leaderboard
 * - Timer (if enabled)
 * - Student submission status
 */

function QuizRoom({ socket, roomId, userRole, studentName, onExit }) {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [message, setMessage] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);

  useEffect(() => {
    // Quiz started
    socket.on('quiz_started', ({ totalQuestions }) => {
      console.log(`Quiz started with ${totalQuestions} questions`);
      setQuizStarted(true);
    });

    // Question sent by teacher
    socket.on('question_sent', (data) => {
      console.log('New question:', data.text);
      setCurrentQuestion(data);
      setQuestionIndex(data.questionIndex);
      setSelectedAnswer(null);
      setAnswered(false);
      setShowAnswer(false);
      setMessage('');
      setTimeLeft(data.timeLimit);
    });

    // Answer submitted by any student
    socket.on('answer_submitted', ({ studentName: submitterName, correct, leaderboard: newLeaderboard }) => {
      setLeaderboard(newLeaderboard);
      if (userRole === 'student' && submitterName === studentName) {
        setMessage(correct ? ' Correct! +10 points' : ' Wrong answer');
      }
    });

    // Time's up
    socket.on('time_up', ({ correctAnswer: answer, leaderboard: newLeaderboard }) => {
      console.log('Time up!');
      setShowAnswer(true);
      setCorrectAnswer(answer);
      setLeaderboard(newLeaderboard);
      setMessage(' Time up! Answer revealed.');
    });

    // Show correct answer
    socket.on('show_answer', ({ correctAnswer: answer, leaderboard: newLeaderboard }) => {
      console.log('Correct answer revealed:', answer);
      setShowAnswer(true);
      setCorrectAnswer(answer);
      setLeaderboard(newLeaderboard);
    });

    // Student joined
    socket.on('student_joined', ({ studentName: joinedName, leaderboard: newLeaderboard }) => {
      setLeaderboard(newLeaderboard);
    });

    // Student left
    socket.on('student_left', ({ studentName: leftName, leaderboard: newLeaderboard }) => {
      setLeaderboard(newLeaderboard);
    });

    return () => {
      socket.off('quiz_started');
      socket.off('question_sent');
      socket.off('answer_submitted');
      socket.off('time_up');
      socket.off('show_answer');
      socket.off('student_joined');
      socket.off('student_left');
    };
  }, [socket, studentName, userRole]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || answered || showAnswer) return;

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, answered, showAnswer]);

  const handleSubmitAnswer = (optionIndex) => {
    if (answered || !currentQuestion) return;

    setSelectedAnswer(optionIndex);
    setAnswered(true);

    socket.emit('submit_answer', { answer: optionIndex }, (response) => {
      if (response.success) {
        console.log('Answer submitted');
      }
    });
  };

  if (!quizStarted) {
    return (
      <div className="quiz-room">
        <div className="waiting-screen">
          <h2> Waiting for quiz to start...</h2>
          <p>Teacher will initiate the quiz shortly</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="quiz-room">
        <div className="waiting-screen">
          <h2> Waiting for question...</h2>
          <p>Teacher is preparing the next question</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-room">
      <div className="quiz-header">
        {userRole === 'student' && <span className="student-name"> {studentName}</span>}
        {userRole === 'teacher' && <span className="teacher-label"> Teacher View</span>}
        <span className="question-counter">Q{questionIndex}</span>
      </div>

      <div className="quiz-container">
        {/* Main Quiz Area */}
        <div className="quiz-main">
          <div className="question-box">
            <h2>{currentQuestion.text}</h2>

            {userRole === 'student' && (
              <div className="time-indicator">
                <span className={`timer ${timeLeft <= 5 ? 'warning' : ''}`}>
                   {timeLeft}s
                </span>
              </div>
            )}
          </div>

          <div className="options">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                className={`option-btn ${
                  selectedAnswer === idx ? 'selected' : ''
                } ${showAnswer && correctAnswer === idx ? 'correct' : ''} ${
                  showAnswer && selectedAnswer === idx && correctAnswer !== idx
                    ? 'incorrect'
                    : ''
                }`}
                onClick={() => handleSubmitAnswer(idx)}
                disabled={answered || userRole === 'teacher'}
              >
                <span className="option-letter">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{option}</span>
              </button>
            ))}
          </div>

          {userRole === 'student' && message && (
            <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          {userRole === 'student' && answered && !showAnswer && (
            <p className="submitted-message">✓ Answer submitted</p>
          )}
        </div>

        {/* Leaderboard Sidebar */}
        <div className="leaderboard-sidebar">
          <h3> Leaderboard</h3>
          <div className="leaderboard-compact">
            {leaderboard.slice(0, 8).map((student, idx) => (
              <div
                key={student.socketId}
                className={`leaderboard-compact-item ${
                  userRole === 'student' && student.name === studentName
                    ? 'you'
                    : ''
                }`}
              >
                <span className="rank">#{idx + 1}</span>
                <span className="name">{student.name}</span>
                <span className="score">{student.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizRoom;
