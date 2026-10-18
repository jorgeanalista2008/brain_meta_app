"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  role: "user" | "bot";
  content: string;
  time: string;
}

interface KnowledgeItem {
  id: number;
  category: string;
  topic: string;
  content: string;
  created_at: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content:
        "¡Hola! Soy **BrainAgent** en Next.js. Puedo supervisar tu aplicación, consultar métricas, tomar acciones y **aprender nuevas reglas** en PostgreSQL. ¿Qué deseas hacer?",
      time: "Ahora",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchKnowledge = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/knowledge");
      if (res.ok) {
        const data = await res.json();
        setKnowledge(data.knowledge || []);
      }
    } catch {
      // Backend might be warming up
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || isLoading) return;

    const userTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { role: "user", content: text, time: userTime }]);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (res.ok && data.reply) {
        setMessages((prev) => [...prev, { role: "bot", content: data.reply, time: botTime }]);
        fetchKnowledge();
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: `❌ Error: ${data.error || "Falla en el cerebro"}`, time: botTime },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: `❌ No se pudo conectar con el Cerebro (Backend en :3000): ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-[#0f172a]/95 border-r border-slate-800 flex flex-col p-5 gap-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-2xl p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20">
            🧠
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white">Brain Meta App</h1>
            <p className="text-xs text-slate-400">Next.js + Gemini 3.5 + Postgres</p>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Comandos Rápidos
          </span>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => sendMessage("¿Cómo está la salud del servidor y la memoria actual?")}
              className="text-left text-xs bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/60 text-slate-200 p-2.5 rounded-lg transition-all"
            >
              🩺 Salud del Sistema
            </button>
            <button
              onClick={() => sendMessage("Muéstrame las métricas de tráfico y usuarios de la última hora")}
              className="text-left text-xs bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/60 text-slate-200 p-2.5 rounded-lg transition-all"
            >
              📊 Métricas de Tráfico
            </button>
            <button
              onClick={() => sendMessage("¿Cuáles son los procedimientos aprendidos guardados en la base de datos?")}
              className="text-left text-xs bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/60 text-slate-200 p-2.5 rounded-lg transition-all"
            >
              📚 Procedimientos Aprendidos
            </button>
          </div>
        </div>

        {/* Knowledge List */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Memoria PostgreSQL
            </span>
            <button
              onClick={fetchKnowledge}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              Refrescar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {knowledge.length === 0 ? (
              <div className="text-xs text-slate-500 p-3 bg-slate-900/40 rounded-lg border border-slate-800/50">
                Sin registros aún. Enséñale una regla en el chat para guardarla en PostgreSQL.
              </div>
            ) : (
              knowledge.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 p-3 rounded-lg text-xs transition"
                >
                  <span className="inline-block bg-purple-950/70 text-purple-300 border border-purple-800/50 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium mb-1">
                    {item.category}
                  </span>
                  <h4 className="font-medium text-slate-200 mb-1">{item.topic}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">{item.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main Chat */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#060a12]">
        <header className="h-16 border-b border-slate-800 bg-[#0a0f1d]/80 backdrop-blur px-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">Consola de Control del Asistente</h2>
            <p className="text-xs text-slate-400">Interacción directa con el agente y herramientas operativas</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400"></span>
            Cerebro Online
          </div>
        </header>

        {/* Message feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col max-w-3xl ${
                m.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
              }`}
            >
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm shadow-md shadow-indigo-600/10"
                    : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 px-1">
                {m.role === "user" ? "Tú" : "BrainAgent"} • {m.time}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/50 border border-slate-800/70 p-3 rounded-xl max-w-sm">
              <span className="animate-spin text-indigo-400">⚙️</span>
              <span>Procesando consulta y ejecutando herramientas...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-4 bg-[#0a0f1d] border-t border-slate-800/90 flex gap-3 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe una instrucción, pregunta o enséñale una nueva regla..."
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none transition"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-5 py-3 rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <span>Enviar</span>
            <span>➤</span>
          </button>
        </form>
      </main>
    </div>
  );
}
