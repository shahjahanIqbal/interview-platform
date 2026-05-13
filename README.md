# 🤖 InterviewAI — AI-Powered Mock Interview Platform

A full-stack web application that simulates real interview experiences using HuggingFace AI. Practice technical and behavioral interviews with real-time AI evaluation, voice support, and detailed analytics.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **Role-Based Questions** | 16+ roles across Engineering, Data, Management, Design |
| ⏱️ **Timed Sessions** | 10/20/30 min or unlimited — timer enforced |
| 🎙️ **Voice Mode** | Speak answers via Web Speech API; AI reads questions aloud |
| 📄 **Resume Upload** | PDF/DOCX/TXT — AI asks resume-specific questions |
| 🔥 **Difficulty Levels** | Easy, Medium, Hard — adjusts question complexity |
| ⏹️ **End Session Button** | End any interview early; results saved automatically |
| 📊 **Visual Results** | Bar charts, radar plots, score distribution, pie charts |
| 🤖 **AI Evaluation** | Score 1–5, strengths, improvements, better answer suggestions |
| 📥 **Export** | Download report as PDF, Word (.docx), or Markdown |
| 🔒 **Tab Monitoring** | Detects tab switching, window blur, copy/paste during interview |
| 📝 **Full Transcript** | Every Q&A recorded; viewable and downloadable |

---

## 🛠️ Technology Stack

### Frontend
- **React.js 18** with React Router v6
- **Recharts** — bar, radar, pie, line charts
- **Web Speech API** — voice input + TTS output
- **jsPDF** — PDF export
- **docx** — Word document export
- **Tailwind-inspired custom CSS** (single CSS file, no Tailwind dependency)

### Backend
- **Node.js + Express** REST API
- **WebSocket (ws)** — real-time session support
- **Multer** — resume file uploads
- **pdf-parse** — PDF text extraction
- **mammoth** — DOCX text extraction
- **express-rate-limit** — API protection

### AI Engine
- **HuggingFace Inference API** — `mistralai/Mistral-7B-Instruct-v0.2`
  - Question generation (role + difficulty + resume context)
  - Answer evaluation (score 1–5, strengths, improvements)
  - Follow-up question generation
  - Session summary generation

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A free [HuggingFace account](https://huggingface.co) with an API token

### 1. Clone / Extract the project
```bash
cd interview-platform
```

### 2. Install all dependencies
```bash
npm run install:all
```
Or manually:
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure environment variables

**Backend** — copy and edit:
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env`:
```env
HUGGINGFACE_API_KEY=hf_your_token_here
PORT=5000
FRONTEND_URL=http://localhost:3000
```

**Frontend** — copy and edit:
```bash
cp frontend/.env.example frontend/.env
```
Edit `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:5000
```

### 4. Get your HuggingFace API Key
1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Click **New token** → select **Read** access
3. Copy the token and paste it into `backend/.env`

### 5. Run the application

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
# App opens at http://localhost:3000
```

---

## 📁 Project Structure

```
interview-platform/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express + WebSocket server
│   │   ├── routes/
│   │   │   ├── interview.js       # Start, answer, end, results endpoints
│   │   │   ├── resume.js          # Resume upload & parsing
│   │   │   └── session.js         # Roles list endpoint
│   │   └── services/
│   │       └── huggingface.js     # All HuggingFace API calls
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.jsx                # Root component + React Router
│   │   ├── index.js               # ReactDOM entry point
│   │   ├── components/
│   │   │   └── Navbar.jsx         # Top navigation bar
│   │   ├── pages/
│   │   │   ├── SetupPage.jsx      # Interview configuration screen
│   │   │   ├── InterviewPage.jsx  # Live interview chat screen
│   │   │   └── ResultsPage.jsx    # Results dashboard with charts
│   │   ├── hooks/
│   │   │   ├── useVoice.js        # Web Speech API (STT + TTS)
│   │   │   └── useTabDetection.js # Tab/window switch monitoring
│   │   ├── utils/
│   │   │   ├── api.js             # Centralized fetch wrapper
│   │   │   └── export.js          # PDF / DOCX / Markdown export
│   │   └── styles/
│   │       └── main.css           # All styles (dark futuristic theme)
│   ├── .env.example
│   └── package.json
│
├── package.json                   # Root convenience scripts
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/interview/start` | Start session, generate questions |
| `POST` | `/api/interview/answer` | Submit answer, get evaluation |
| `POST` | `/api/interview/end` | End session early |
| `GET`  | `/api/interview/results/:id` | Full results + AI summary |
| `GET`  | `/api/interview/session/:id` | Current session state |
| `POST` | `/api/resume/upload` | Upload & parse resume |
| `GET`  | `/api/session/roles` | Available interview roles |
| `GET`  | `/health` | Server health check |
| `WS`   | `/ws?sessionId=...` | WebSocket real-time channel |

---

## 🧠 AI Model Details

The platform uses **`mistralai/Mistral-7B-Instruct-v0.2`** via HuggingFace Inference API for:

1. **Question Generation** — Structured prompt asking for N role-specific questions at a given difficulty, with optional resume context
2. **Answer Evaluation** — JSON-structured response with score, rating, strengths, improvements, and a better answer
3. **Follow-up Questions** — Contextual follow-ups when candidate scores low
4. **Session Summary** — Overall performance assessment after the interview

To use a different model, set `HF_CHAT_MODEL` in `backend/.env`. Any instruction-tuned model on HuggingFace works (e.g., `HuggingFaceH4/zephyr-7b-beta`, `tiiuae/falcon-7b-instruct`).

---

## 🎙️ Voice Mode Notes

- Uses browser's **Web Speech API** — works best in **Google Chrome**
- Speech-to-text captures your spoken answer
- Text-to-speech reads each question aloud
- Full transcript is maintained for all voice interactions
- Firefox/Safari have limited support — use Chrome for voice mode

---

## ⚠️ Troubleshooting

**"HUGGINGFACE_API_KEY not configured"**
→ Make sure you copied `.env.example` to `.env` and added your token.

**"Model is loading" error from HuggingFace**
→ Free-tier models may be cold. The backend retries with `wait_for_model: true`. Wait 30s and try again.

**Voice mode not working**
→ Use Google Chrome. Allow microphone permission when prompted. Check browser console for errors.

**Resume upload fails**
→ Ensure file is PDF, DOCX, or TXT and under 10MB. Scanned PDFs (images) won't extract text.

**CORS error in browser**
→ Verify `FRONTEND_URL=http://localhost:3000` is set in `backend/.env`.

---

## 📝 License

MIT — free to use, modify, and distribute.
