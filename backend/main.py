from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import os
import time

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.environ["GROQ_API_KEY"])
GROQ_MODEL = "llama-3.3-70b-versatile"

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

class ChatResponse(BaseModel):
    reply: str

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    last_error = None
    for attempt in range(3):
        try:
            completion = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "user", "content": request.message}],
                temperature=0.7,
                max_tokens=1024,
            )
            return ChatResponse(reply=completion.choices[0].message.content)
        except Exception as e:
            last_error = e
            error_str = str(e)
            if "429" in error_str or "rate_limit" in error_str.lower():
                if attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
                raise HTTPException(
                    status_code=429,
                    detail="Groq rate limit exceeded. Please wait a moment and try again."
                )
            raise HTTPException(status_code=500, detail=error_str)
    raise HTTPException(status_code=500, detail=str(last_error))

@app.delete("/chat/{session_id}")
async def clear_session(session_id: str):
    return {"message": "Session cleared"}

@app.get("/health")
async def health():
    return {"status": "ok"}