import { useState } from 'react';
import '../styles/TeacherLogin.css';

/**
 * TeacherLogin Component
 * 
 * Allows teachers to:
 * - Enter their name
 * - Create a new quiz room
 */

function TeacherLogin({ onCreateRoom }) {
  const [teacherName, setTeacherName] = useState('');
  const [error, setError] = useState('');

  const handleCreateRoom = () => {
    setError('');

    if (!teacherName.trim()) {
      setError('Please enter your name');
      return;
    }

    onCreateRoom(teacherName.trim());
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCreateRoom();
    }
  };

  return (
    <div className="teacher-login">
      <div className="login-card">
        <h1> Teacher Portal</h1>
        <p>Create a new quiz room</p>

        <div className="form-group">
          <label>Your Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            value={teacherName}
            onChange={(e) => {
              setTeacherName(e.target.value);
              setError('');
            }}
            onKeyPress={handleKeyPress}
            autoFocus
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button className="btn btn-teacher" onClick={handleCreateRoom}>
          Create Room
        </button>

        <button
          className="btn btn-back"
          onClick={() => window.history.back()}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

export default TeacherLogin;
