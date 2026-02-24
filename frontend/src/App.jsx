import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import TeacherLogin from './components/TeacherLogin';
import TeacherDashboard from './components/TeacherDashboard';
import StudentJoin from './components/StudentJoin';
import QuizRoom from './components/QuizRoom';
import './App.css';

/**
 * Main App Component
 * 
 * States:
 * - initial: Show role selection
 * - teacher_login: Teacher enters their name
 * - teacher_waiting: Teacher created room, waiting for students
 * - student_joining: Student entering room code and name
 * - in_quiz: Quiz is active
 */

function App() {
  const [state, setState] = useState('initial');
  const [userRole, setUserRole] = useState(null); // 'teacher' | 'student'
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [studentName, setStudentName] = useState(null);
  const [teacherName, setTeacherName] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    newSocket.on('room_closed', () => {
      alert('Room closed by teacher');
      setState('initial');
      setUserRole(null);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  // ========== TEACHER FLOW ==========
  const handleTeacherCreate = (name) => {
    if (!socket) return;

    setTeacherName(name);

    socket.emit('create_room', { teacherName: name }, (response) => {
      if (response.success) {
        setRoomId(response.roomId);
        setRoomCode(response.roomCode);
        setState('teacher_waiting');
        setUserRole('teacher');
      }
    });
  };

  // ========== STUDENT FLOW ==========
  const handleStudentJoin = (studentCode, studentNameInput) => {
    if (!socket) return;

    socket.emit(
      'join_room',
      { roomCode: studentCode, studentName: studentNameInput },
      (response) => {
        if (response.success) {
          setRoomId(response.roomId);
          setStudentName(studentNameInput);
          setState('in_quiz');
          setUserRole('student');
        } else {
          alert(response.message || 'Failed to join room');
        }
      }
    );
  };

  return (
    <div className="app">
      {state === 'initial' && (
        <div className="welcome-screen">
          <div className="welcome-card">
            <h1> LivePoll</h1>
            <p>Real-Time Classroom Quiz Engine</p>
            <div className="button-group">
              <button
                className="btn btn-teacher"
                onClick={() => {
                  setState('teacher_login');
                  setUserRole('teacher');
                }}
              >
                 I'm a Teacher
              </button>
              <button
                className="btn btn-student"
                onClick={() => {
                  setState('student_joining');
                  setUserRole('student');
                }}
              >
                 I'm a Student
              </button>
            </div>
          </div>
        </div>
      )}

      {state === 'teacher_login' && (
        <TeacherLogin onCreateRoom={handleTeacherCreate} />
      )}

      {state === 'teacher_waiting' && socket && userRole === 'teacher' && (
        <TeacherDashboard socket={socket} roomId={roomId} roomCode={roomCode} />
      )}

      {state === 'student_joining' && (
        <StudentJoin onJoin={handleStudentJoin} />
      )}

      {state === 'in_quiz' && socket && (
        <QuizRoom
          socket={socket}
          roomId={roomId}
          userRole={userRole}
          studentName={studentName}
          onExit={() => {
            setState('initial');
            setUserRole(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
