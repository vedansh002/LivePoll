# 🎯 LivePoll – Real-Time Classroom Quiz Engine

A full-stack real-time quiz platform built in one day with **Node.js + Express + Socket.io** (backend) and **React + Hooks** (frontend).

## 📂 Folder Structure

```
LivePoll/
├── backend/
│   ├── server.js              # Express + Socket.io server
│   ├── socketHandler.js       # All WebSocket event handlers
│   ├── roomManager.js         # In-memory room state management
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── TeacherDashboard.jsx    # Teacher creates/manages quizzes
    │   │   ├── StudentJoin.jsx         # Student join screen
    │   │   └── QuizRoom.jsx            # Shared quiz playing interface
    │   ├── styles/
    │   │   ├── App.css
    │   │   ├── StudentJoin.css
    │   │   ├── TeacherDashboard.css
    │   │   └── QuizRoom.css
    │   ├── App.jsx              # Main app component
    │   └── index.jsx            # React entry point
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 16+** (Check: `node --version`)
- **npm** (Check: `npm --version`)

### Step 1: Install Backend Dependencies

```bash
cd LivePoll/backend
npm install
```

Expected output: Express, Socket.io, and CORS installed.

### Step 2: Start Backend Server

```bash
npm start
```

Expected output:
```
🚀 LivePoll Backend running on http://localhost:5000
📡 Socket.IO ready for connections
```

**Keep this terminal open!**

### Step 3: Install Frontend Dependencies (NEW TERMINAL)

```bash
cd LivePoll/frontend
npm install
```

Expected output: React, React-DOM, Socket.io-client, and Vite installed.

### Step 4: Start Frontend Dev Server

```bash
npm run dev
```

Expected output:
```
  VITE v4.3.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

Your browser should automatically open to `http://localhost:3000/`

---

## 🎮 How to Use

### Teacher Flow

1. **Open app** → Click **"I'm a Teacher"**
2. **Enter name** → Gets redirected to TeacherDashboard
3. **Share room code** with students (displayed on screen, copyable)
4. **Add questions**:
   - Enter question text
   - Add 4 options
   - Select correct answer (radio button)
   - Set time limit (0 = no auto-advance)
   - Click "Add Question"
5. **Start Quiz** → Click "🎬 Start Quiz"
6. **Manage quiz flow**:
   - Send questions manually
   - Watch leaderboard update in real-time
   - Click "Next Question" to reveal answer and move on

### Student Flow

1. **Open app** → Click **"I'm a Student"**
2. **Enter room code** (6-character code from teacher)
3. **Enter your name**
4. **Click "Join Quiz"**
5. **Wait for teacher** to start quiz
6. **Answer questions**:
   - Only first submission counts
   - Correct answer = +10 points
   - Leaderboard updates instantly
7. **View rankings** in real-time

---

## 🏗️ Architecture & Key Decisions

### Backend Architecture

**RoomManager** (`roomManager.js`)
- Singleton pattern for in-memory state management
- Room structure with students, questions, scores
- Safe submission handling to prevent race conditions
- Automatic leaderboard sorting

**SocketHandler** (`socketHandler.js`)
- Clean event-driven architecture
- 8 main events: `create_room`, `join_room`, `start_quiz`, `send_question`, `submit_answer`, `next_question`, disconnect, etc.
- No middleware overhead (kept simple)
- Proper cleanup on disconnect

**Why In-Memory?**
- No database setup = faster development
- Sufficient for one-day MVP
- Data resets on server restart (acceptable for demo)

### Frontend Architecture

**Component Structure**:
- **App.jsx** – Main orchestrator, socket initialization, routing between roles
- **TeacherDashboard** – Quiz management UI
- **StudentJoin** – Room entry form
- **QuizRoom** – Shared quiz display (both roles)

**Why Hooks + No Redux?**
- `useState` for local component state (answers, leaderboard)
- `useEffect` for socket event listeners
- Small app doesn't need global state management
- Hooks are more readable for this scope

### Why Socket.io?

✅ Real-time bidirectional communication  
✅ Automatic reconnection  
✅ Built-in rooms (one Socket.io room per quiz room)  
✅ No complex polling  

### Race Condition Prevention

In `submitAnswer()` method:
```javascript
// Prevent double submissions
if (student.hasAnswered) {
  return { success: false, message: 'Already submitted' };
}
```

Once `hasAnswered = true`, no further submissions accepted.

### Leaderboard Sorting

```javascript
.sort((a, b) => b.score - a.score)
```

Happens on every answer submission → always fresh rankings.

---

## 📡 Socket.io Events Flow

### Teacher → Server → Students

```
1. create_room()
   ↓
2. start_quiz({ questions })
   ↓
3. send_question({ questionIndex })
   ↓
4. next_question() → show_answer + leaderboard
   ↓
5. [Repeat 3-4] or [Disconnect]
```

### Student → Server → All

```
1. join_room({ roomCode, studentName })
   ↓
2. [Wait for quiz_started]
   ↓
3. [Receive question_sent]
   ↓
4. submit_answer({ answer: optionIndex })
   ↓
5. [Leaderboard updates for all]
   ↓
6. [Repeat 3-5] or [Disconnect]
```

---

## 🛠️ Example Quiz Questions

Try this in TeacherDashboard:

**Question 1:**
- Text: "What is the capital of France?"
- Options: [London, Paris, Berlin, Madrid]
- Correct: Paris (index 1)
- Time: 15 seconds

**Question 2:**
- Text: "Which planet is largest?"
- Options: [Earth, Saturn, Jupiter, Neptune]
- Correct: Jupiter (index 2)
- Time: 15 seconds

---

## 🔧 Customization Ideas (For Real-World Use)

1. **Add authentication** (JWT tokens)
2. **Add database** (MongoDB/PostgreSQL)
3. **Persist quizzes** (save/load past quizzes)
4. **User accounts** with quiz history
5. **Team mode** (group answers)
6. **Image questions** (with image upload)
7. **Different question types** (multiple-choice, true/false, short-answer)
8. **Export leaderboard** (CSV/PDF)
9. **Streak tracking** (consecutive correct answers)
10. **Analytics** (question difficulty, avg score, etc.)

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process or change PORT in server.js
```

### Frontend can't connect to backend
- Ensure backend is running (`http://localhost:5000/health` should return `{status: "Backend is running"}`)
- Check CORS settings in `server.js`
- Ensure ports are correct (5000 for backend, 3000 for frontend)

### Students can't join
- Verify room code is exact (case-insensitive, but stored as uppercase)
- Check backend console for errors

### Leaderboard not updating
- Check browser console for Socket.io errors
- Refresh page if stuck

---

## 📝 Code Quality Notes

✅ **Clean separation of concerns** (roomManager vs socketHandler)  
✅ **Extensive comments** on complex logic  
✅ **No memory leaks** (socket cleanup on disconnect)  
✅ **Error handling** on join/submit  
✅ **Scalable structure** (easy to add features)  
✅ **Interview-focused** (readable, not over-engineered)  

---

## 🎓 Key Learnings from Building This

1. **Socket.io Namespacing**: Using rooms (`socket.join(roomId)`) instead of global broadcasts
2. **Concurrency Safety**: Managing state without locks (JavaScript single-threaded)
3. **Real-time UX**: Anticipating edge cases (double-clicks, disconnects, stale data)
4. **React Hooks**: useEffect cleanup is critical for socket listeners
5. **CSS Grid**: Responsive layouts without Bootstrap

---

## 📄 License

Free to use for educational purposes.

---

## 🚀 Next Steps

1. Run the app locally ✅
2. Play with it (teacher + 2-3 students in different browsers)
3. Check browser DevTools → Network → WS for socket events
4. Modify questions, test edge cases
5. Deploy (Heroku for backend, Vercel for frontend)

**Happy quizzing!** 🎯
