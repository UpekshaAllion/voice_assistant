"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { sendMessage, clearSession } from "@/lib/api";
import { SpeechRecognition, SpeechRecognitionConstructor } from "@/types/common";
import ReactMarkdown from "react-markdown";

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

type MessageRole = "user" | "assistant";
interface Message {
  role: MessageRole;
  text: string;
}

const SESSION_ID = "user-" + Math.random().toString(36).substr(2, 9);

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError("Speech Recognition not supported. Use Chrome or Edge.");
      return;
    }

    // Setup Speech Recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const current = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      setTranscript(current);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setError(`Mic error: ${event.error}`);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    synthRef.current = window.speechSynthesis;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel(); // Stop any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Optional: pick a preferred voice
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(
      (v) => v.lang === "en-US" && v.name.includes("Google")
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setTranscript("");
    setError("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setIsLoading(true);

    try {
      const reply = await sendMessage(text, SESSION_ID);
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      speak(reply);
    } catch (err: any) {
      if (err?.message?.includes("429") || err?.status === 429) {
        setError("API quota exceeded. Please wait a moment or get a new API key at aistudio.google.com/apikey");
      } else {
        setError("Failed to get response. Is the backend running?");
      }
    } finally {
      setIsLoading(false);
    }
  }, [speak]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript("");
      setError("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening, isSupported]);

  const handleSendClick = useCallback(() => {
    if (transcript.trim()) {
      handleSend(transcript);
    }
  }, [transcript, handleSend]);

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  };

  const handleClear = async () => {
    setMessages([]);
    setTranscript("");
    await clearSession(SESSION_ID);
  };

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[1000px] flex flex-col gap-6 h-full max-h-full">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-indigo-400">🎙️ Voice AI Assistant</h1>
          <p className="text-gray-400 text-sm mt-1">Powered by llama-3.3-70b-versatile + Web Speech API</p>
        </div>

        {/* Chat Window */}
        <div className="bg-gray-900 rounded-2xl p-4 flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 border border-gray-800">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 my-auto">
              Press the mic button and start talking...
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-xl px-4 py-2 max-w-xs lg:max-w-md text-sm ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-700 text-gray-100"
                }`}
              >
                <span className="block text-xs opacity-60 mb-1">
                  {msg.role === "user" ? "You" : "AI"}
                </span>
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 rounded-xl px-4 py-2 text-sm text-gray-300 animate-pulse">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Live Transcript + Send */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-800 rounded-xl px-4 py-2 text-sm text-gray-300 border border-indigo-500/40 min-h-[44px] flex items-center">
            {isListening ? (
              <>
                <span className="text-indigo-400 font-semibold mr-1">🎤 </span>
                {transcript || "Listening..."}
              </>
            ) : (
              transcript || <span className="text-gray-500">Press the mic and speak...</span>
            )}
          </div>
          <button
            onClick={handleSendClick}
            disabled={!transcript.trim() || isLoading || isListening}
            className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-500 text-xl transition-all
              disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
            title="Send message"
          >
            ➤
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/40 border border-red-500 rounded-xl px-4 py-2 text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Mic Button */}
          <button
            onClick={toggleListening}
            disabled={isLoading || isSpeaking || !isSupported}
            className={`w-20 h-20 rounded-full text-3xl font-bold transition-all shadow-lg
              ${isListening
                ? "bg-red-500 hover:bg-red-600 animate-pulse scale-110"
                : "bg-indigo-600 hover:bg-indigo-500"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isListening ? "⏹" : "🎤"}
          </button>

          {/* Stop Speaking */}
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="w-12 h-12 rounded-full bg-yellow-600 hover:bg-yellow-500 text-xl transition-all"
            >
              🔇
            </button>
          )}

          {/* Clear */}
          <button
            onClick={handleClear}
            className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 text-lg transition-all"
          >
            🗑️
          </button>
        </div>

        <p className="text-center text-xs text-gray-600">
          {isListening ? "Tap ⏹ to stop recording" : transcript ? "Tap ➤ to send" : "Tap 🎤 to speak"}
        </p>
      </div>
    </div>
  );
}