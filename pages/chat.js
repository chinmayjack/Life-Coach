// /pages/index.js
import { useState, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Chat() {
  const { data: session, status } = useSession();
  const [scenario, setScenario] = useState("");
  const [persona, setPersona] = useState("Coach");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (status === "loading") return <p className="text-center mt-10">Loading session...</p>;

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <h1 className="text-3xl font-bold mb-6">AI Life Coach</h1>
        <p className="mb-6">You must be signed in to use the chat.</p>
        <button
          className="px-6 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition"
          onClick={() => signIn("google")}
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!scenario) return setError("Please enter a scenario");

    setLoading(true);
    setError("");

    try {
      const userMessage = { role: "user", content: scenario };
      setMessages((prev) => [...prev, userMessage]);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, persona }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch AI response");
      }

      const data = await res.json();
      const aiMessage = { role: "assistant", content: data.response };
      setMessages((prev) => [...prev, aiMessage]);

      setScenario("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">AI Life Coach</h1>
        <div className="flex items-center space-x-4">
          <p>{session.user.email}</p>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 p-6 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-center text-gray-400">Start by typing a scenario and hitting Send.</p>
        )}
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.role === "user"
                    ? "bg-green-500 text-white rounded-br-none"
                    : "bg-gray-700 text-white rounded-bl-none"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Input area */}
      <footer className="bg-gray-800 p-4 flex items-center space-x-2">
        <input
          type="text"
          placeholder="Enter your scenario..."
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-600 rounded-full bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
        />
        <select
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          className="px-4 py-2 border border-gray-600 rounded-full bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="Coach">Coach</option>
          <option value="Mentor">Mentor</option>
          <option value="Advisor">Advisor</option>
        </select>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 transition"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </footer>

      {error && <p className="text-center text-red-500 mt-2">{error}</p>}
    </div>
  );
}
