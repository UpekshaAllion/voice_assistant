# Voice Assistant

A full-stack AI-powered voice assistant that lets users speak a question, sends it to an LLM backend, and reads the response aloud using the browser's built-in speech synthesis.

---

## Tools & Technologies

### Backend
| Tool | Purpose |
|---|---|
| **Python** | Backend language |
| **FastAPI** | REST API framework (`/chat`, `/health` endpoints) |
| **Uvicorn** | ASGI server to run FastAPI |
| **Groq SDK** | Client to call the Groq cloud LLM API |
| **LLaMA 3.3 70B** (`llama-3.3-70b-versatile`) | LLM model served via Groq |
| **Pydantic** | Request/response data validation |
| **python-dotenv** | Loads `GROQ_API_KEY` from a `.env` file |

### Frontend
| Tool | Purpose |
|---|---|
| **Next.js 16** | React framework (App Router) |
| **React 19** | UI component library |
| **TypeScript** | Type-safe frontend code |
| **Tailwind CSS** | Utility-first styling |
| **Web Speech API** | Browser-native speech recognition (microphone input) and speech synthesis (voice output) |
| **uuid** | Generates unique session IDs per browser session |

---

## Project Structure

```
voice_assistant/
├── backend/
│   ├── main.py           # FastAPI app — /chat, /health, /chat/{session_id} endpoints
│   ├── requirements.txt  # Python dependencies
│   └── readme.md         # Backend-specific notes
└── frontend/
    ├── app/
    │   ├── page.tsx       # Root page — renders VoiceAssistant component
    │   ├── layout.tsx     # App layout and global metadata
    │   └── globals.css    # Global styles
    ├── components/
    │   └── VoiceAssistant.tsx  # Core UI — mic button, chat history, speak/listen logic
    ├── lib/
    │   └── api.ts         # sendMessage() and clearSession() API calls to backend
    ├── types/
    │   └── common.ts      # Shared TypeScript type definitions
    └── package.json       # Frontend dependencies
```

---

## Project Flow

```
User speaks into microphone
        │
        ▼
[Browser – Web Speech API]
  SpeechRecognition captures audio
  and converts it to text (transcript)
        │
        ▼
[Frontend – VoiceAssistant.tsx]
  On speech end, transcript is sent
  to the backend via sendMessage()
        │
        ▼
[Frontend – lib/api.ts]
  POST /chat  →  { message, session_id }
        │
        ▼
[Backend – FastAPI /chat endpoint]
  Receives the message and forwards
  it to Groq with the LLaMA 3.3 70B model
        │
        ▼
[Groq Cloud – LLaMA 3.3 70B]
  LLM processes the prompt and
  returns an AI-generated reply
        │
        ▼
[Backend – FastAPI]
  Returns { reply: "..." } as JSON
  (with retry logic for rate limits)
        │
        ▼
[Frontend – VoiceAssistant.tsx]
  Displays reply in chat history
  and speaks it aloud via
  Web Speech API SpeechSynthesis
        │
        ▼
User hears the AI response
```
```
Browser Mic → Web Speech API (STT) → Next.js Frontend→ FastAPI Backend → Groq Cloud – LLaMA 3.3 70B → FastAPI Response → Next.js → Web Speech API (TTS) → Speaker
```


---

## Getting Started

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
# Create a .env file with your Groq API key:
# GROQ_API_KEY=your_key_here
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge (required for Web Speech API support).

---

## Environment Variables

| Variable | Location | Description |
|---|---|---|
| `GROQ_API_KEY` | `backend/.env` | API key from [console.groq.com](https://console.groq.com) |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` (optional) | Backend URL — defaults to `http://localhost:8000` |
