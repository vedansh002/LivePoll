import { useState } from 'react';
import '../styles/StudentJoin.css';

/**
 * StudentJoin Component
 * 
 * Allows students to:
 * - Enter room code
 * - Enter their name
 * - Join the quiz room
 */

function StudentJoin({ onJoin }) {
  const [roomCode, setRoomCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState('');

  const handleJoin = () => {
    setError('');

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    if (!studentName.trim()) {
      setError('Please enter your name');
      return;
    }

    console.log("🎯 1. BUTTON CLICKED! Sending data:", { roomCode, studentName });
    onJoin(roomCode.trim().toUpperCase(), studentName.trim());
  };

  return (
    <div className="student-join">
      <div className="join-card">
        <h1>👨‍🎓 Join Quiz</h1>

        <div className="form-group">
          <label>Room Code</label>
          <input
            type="text"
            placeholder="e.g., ABC123"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase());
              setError('');
            }}
            maxLength="6"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Your Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            value={studentName}
            onChange={(e) => {
              setStudentName(e.target.value);
              setError('');
            }}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button className="btn btn-student" onClick={handleJoin}>
          Join Quiz
        </button>
      </div>
    </div>
  );
}

export default StudentJoin;
