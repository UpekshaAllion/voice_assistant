const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function sendMessage(message: string, sessionId: string): Promise<string> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!res.ok) {
    const err: any = new Error("API error");
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return data.reply;
}

export async function clearSession(sessionId: string): Promise<void> {
  await fetch(`${API_URL}/chat/${sessionId}`, { method: "DELETE" });
}