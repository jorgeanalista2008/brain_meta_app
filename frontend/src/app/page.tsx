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

interface CategoryItem {
  id: number;
  slug: string;
  name: string;
  description?: string;
  created_at: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"overview" | "chat" | "errors" | "knowledge" | "categories">("overview");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content:
        "Hola, soy **BrainAgent**. Estoy activo y monitoreando tu infraestructura, base de datos y servicios. ¿En qué te puedo ayudar?",
      time: "Ahora",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState("rule");
  const [newTopic, setNewTopic] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isSubmittingRule, setIsSubmittingRule] = useState(false);
  
  // States para crear nueva categoría
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  const [health, setHealth] = useState<any>({
    status: "healthy",
    uptimeSeconds: 3600,
    memoryUsageMb: { heapUsed: 24, rss: 82 },
    databaseConnection: "connected",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        if (data.categories?.length > 0 && !newCategory) {
          setNewCategory(data.categories[0].slug);
        }
      }
    } catch {}
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !catSlug.trim()) return;

    setIsSubmittingCat(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName.trim(),
          slug: catSlug.trim(),
          description: catDesc.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCategoryModal(false);
        setCatName("");
        setCatSlug("");
        setCatDesc("");
        await fetchCategories();
      } else {
        alert("Error al guardar categoría: " + (data.error || "Falla en servidor"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!confirm(`¿Seguro que deseas eliminar la categoría '${name}'?`)) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchCategories();
      }
    } catch (err: any) {
      alert("Error al eliminar categoría: " + err.message);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !newContent.trim()) return;

    setIsSubmittingRule(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newCategory,
          topic: newTopic.trim(),
          content: newContent.trim(),
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewTopic("");
        setNewContent("");
        setNewCategory("rule");
        await fetchKnowledge();
      } else {
        alert("Error al guardar la regla.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmittingRule(false);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar esta regla de la memoria?")) return;
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchKnowledge();
      }
    } catch (err: any) {
      alert("Error al eliminar regla: " + err.message);
    }
  };

  const fetchKnowledge = async () => {
    try {
      const res = await fetch("/api/knowledge");
      if (res.ok) {
        const data = await res.json();
        setKnowledge(data.knowledge || []);
      }
    } catch {}
  };

  const fetchErrors = async () => {
    try {
      const res = await fetch("/api/errors");
      if (res.ok) {
        const data = await res.json();
        setErrors(data.errors || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchKnowledge();
    fetchErrors();
    fetchCategories();
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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const contentType = res.headers.get("content-type") || "";
      let data: any = {};
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const textResp = await res.text();
        data = { error: textResp || `Error del servidor (código ${res.status})` };
      }

      const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (res.ok && data.reply) {
        setMessages((prev) => [...prev, { role: "bot", content: data.reply, time: botTime }]);
        fetchKnowledge();
        fetchErrors();
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
          content: `❌ Error al conectar con el servidor: ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased overflow-hidden">
      {/* Sidebar estilo Mapbox Console */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* User profile / Organization header */}
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              JA
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-slate-900 truncate">jorgeanalista2008</h2>
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Pro Account
              </span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === "overview"
                  ? "bg-blue-50 text-blue-600 font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Dashboard General</span>
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === "chat"
                  ? "bg-blue-50 text-blue-600 font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span>Asistente IA (Chat)</span>
            </button>

            <div className="pt-4 pb-1 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Control & Datos
            </div>

            <button
              onClick={() => setActiveTab("knowledge")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === "knowledge"
                  ? "bg-blue-50 text-blue-600 font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Base de Conocimiento</span>
              <span className="ml-auto bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                {knowledge.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("errors")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === "errors"
                  ? "bg-red-50 text-red-600 font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Registro de Errores</span>
              {errors.length > 0 && (
                <span className="ml-auto bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {errors.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("categories")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === "categories"
                  ? "bg-blue-50 text-blue-600 font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>Categorías</span>
              <span className="ml-auto bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                {categories.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Gemini 3.1 + PostgreSQL</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {activeTab === "overview" && "Account overview"}
              {activeTab === "chat" && "Asistente Operativo"}
              {activeTab === "knowledge" && "Base de Conocimiento (Memoria)"}
              {activeTab === "errors" && "Historial de Errores e Incidentes"}
              {activeTab === "categories" && "Gestión de Categorías"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchKnowledge();
                fetchErrors();
                fetchCategories();
              }}
              className="text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md font-medium transition shadow-sm"
            >
              🔄 Sincronizar
            </button>
            <div className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Sistema Saludable
            </div>
          </div>
        </header>

        {/* Dynamic View by Tab */}
        {activeTab === "overview" && (
          <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
            {/* Getting started Cards (Igual al estilo de Mapbox Console) */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-4 tracking-tight">Acciones y Diagnósticos Rápidos</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg mb-3">
                      🩺
                    </div>
                    <h3 className="font-bold text-slate-900 text-xs mb-1">Salud del Sistema</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Inspecciona CPU, memoria Heap/RSS y conexión con PostgreSQL.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("chat");
                      sendMessage("¿Cómo está la salud del servidor y la memoria actual?");
                    }}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition"
                  >
                    Diagnosticar
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg mb-3">
                      📊
                    </div>
                    <h3 className="font-bold text-slate-900 text-xs mb-1">Métricas de Tráfico</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Revisa requests por minuto, usuarios activos y tasas de error.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("chat");
                      sendMessage("Muéstrame las métricas de tráfico y usuarios de la última hora");
                    }}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition"
                  >
                    Consultar Métricas
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-lg mb-3">
                      📚
                    </div>
                    <h3 className="font-bold text-slate-900 text-xs mb-1">Procedimientos</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Consulta soluciones aprendidas y reglas guardadas en Postgres.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("chat");
                      sendMessage("¿Cuáles son los procedimientos aprendidos guardados en la base de datos?");
                    }}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition"
                  >
                    Ver Reglas
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-lg mb-3">
                      🚨
                    </div>
                    <h3 className="font-bold text-slate-900 text-xs mb-1">Auditar Errores</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Revisa incidentes y fallas registradas en agent_error_logs.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("errors")}
                    className="mt-4 w-full bg-slate-900 hover:bg-black text-white text-xs font-semibold py-2 rounded-lg transition"
                  >
                    Explorar Logs
                  </button>
                </div>
              </div>
            </div>

            {/* Account Usage / Servicios activos (Tabla estilo Mapbox) */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Estado de Recursos & Servicios</h2>
                  <p className="text-xs text-slate-500">Métricas operativas del clúster local</p>
                </div>
                <span className="text-xs font-semibold text-blue-600 cursor-pointer hover:underline">
                  Ver estadísticas detalladas →
                </span>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {/* Fila 1 */}
                <div className="py-4 grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-7 h-7 rounded bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                      DB
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">PostgreSQL Database</span>
                      <p className="text-[11px] text-slate-500">brain_meta_db (localhost:5432)</p>
                    </div>
                  </div>
                  <div className="col-span-3 text-slate-700">
                    <strong>4 Tablas</strong>
                    <p className="text-[11px] text-slate-400">knowledge, logs, history, audit</p>
                  </div>
                  <div className="col-span-3">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                      <div className="bg-blue-600 h-1.5 rounded-full w-1/4"></div>
                    </div>
                    <span className="text-[10px] text-slate-500">Conexiones activas: 2 / 100</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                      Conectado
                    </span>
                  </div>
                </div>

                {/* Fila 2 */}
                <div className="py-4 grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                      AI
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">Gemini Generative Engine</span>
                      <p className="text-[11px] text-slate-500">gemini-3.1-flash-lite</p>
                    </div>
                  </div>
                  <div className="col-span-3 text-slate-700">
                    <strong>Google AI Studio</strong>
                    <p className="text-[11px] text-slate-400">Latencia promedio: 820ms</p>
                  </div>
                  <div className="col-span-3">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                      <div className="bg-emerald-500 h-1.5 rounded-full w-1/12"></div>
                    </div>
                    <span className="text-[10px] text-slate-500">Cuota disponible: &gt; 95%</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                      Operativo
                    </span>
                  </div>
                </div>

                {/* Fila 3 */}
                <div className="py-4 grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-7 h-7 rounded bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                      API
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">Backend Server</span>
                      <p className="text-[11px] text-slate-500">Express en http://localhost:4000</p>
                    </div>
                  </div>
                  <div className="col-span-3 text-slate-700">
                    <strong>Memoria Heap: 24 MB</strong>
                    <p className="text-[11px] text-slate-400">Uptime: {Math.floor(health.uptimeSeconds / 60)} min</p>
                  </div>
                  <div className="col-span-3">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                      <div className="bg-blue-600 h-1.5 rounded-full w-1/5"></div>
                    </div>
                    <span className="text-[10px] text-slate-500">Uso de memoria bajo</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                      Saludable
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Chat */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full h-full">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-2xl ${
                    m.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <div
                    className={`p-4 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none shadow-sm"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {m.role === "user" ? "Tú" : "BrainAgent"} • {m.time}
                  </span>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 p-3 rounded-xl max-w-xs shadow-sm">
                  <span className="animate-spin text-blue-600 font-bold">⚙️</span>
                  <span>Procesando y ejecutando herramientas...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="bg-white border border-slate-200 rounded-xl p-2 flex gap-2 shadow-sm shrink-0"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe una instrucción, pregunta o enséñale una nueva regla..."
                className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-900 outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                Enviar
              </button>
            </form>
          </div>
        )}

        {/* Tab Knowledge */}
        {activeTab === "knowledge" && (
          <div className="p-8 max-w-5xl mx-auto w-full space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">Reglas y Soluciones en Memoria</h2>
                <p className="text-xs text-slate-500">Almacenadas en la tabla agent_knowledge de PostgreSQL</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-sm flex items-center gap-1.5"
              >
                <span>+</span>
                <span>Nueva Regla</span>
              </button>
            </div>

            {/* Modal para agregar regla */}
            {showAddModal && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-sm text-slate-900">Agregar Nueva Regla al Cerebro</h3>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                    >
                      &times;
                    </button>
                  </div>

                  <form onSubmit={handleCreateRule} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.slug}>
                            {c.name} ({c.slug})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Título o Tema Clave</label>
                      <input
                        type="text"
                        required
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        placeholder="Ej: Procedimiento ante saturación de base de datos"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Procedimiento / Regla Detallada</label>
                      <textarea
                        required
                        rows={4}
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Escribe el paso a paso exacto que Gemini debe seguir o recordar..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingRule}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                      >
                        {isSubmittingRule ? "Guardando..." : "Guardar en PostgreSQL"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {knowledge.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                Aún no hay reglas registradas. Haz clic en <strong>+ Nueva Regla</strong> para crear la primera.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {knowledge.map((k) => (
                  <div key={k.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2 relative group hover:border-slate-300 transition">
                    <div className="flex justify-between items-start">
                      <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {k.category}
                      </span>
                      <button
                        onClick={() => handleDeleteRule(k.id)}
                        title="Eliminar regla"
                        className="text-slate-300 hover:text-red-600 text-xs transition p-1"
                      >
                        🗑️
                      </button>
                    </div>
                    <h3 className="font-bold text-slate-900 text-xs">{k.topic}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{k.content}</p>
                    <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-50">
                      Registrado: {new Date(k.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Errors */}
        {activeTab === "errors" && (
          <div className="p-8 max-w-5xl mx-auto w-full space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">Incidentes y Errores Capturados</h2>
                <p className="text-xs text-slate-500">Almacenados en la tabla agent_error_logs de PostgreSQL</p>
              </div>
            </div>

            {errors.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-emerald-600 font-medium">
                ✅ No se han registrado incidentes recientes. El sistema opera con normalidad.
              </div>
            ) : (
              <div className="space-y-3">
                {errors.map((err) => (
                  <div key={err.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="bg-red-50 text-red-700 font-bold text-[10px] px-2 py-0.5 rounded">
                        Fuente: {err.source}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(err.occurred_at).toLocaleString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900">{err.error_message}</h4>
                    {err.stack_trace && (
                      <pre className="bg-slate-50 p-2.5 rounded text-[11px] font-mono text-slate-600 overflow-x-auto">
                        {err.stack_trace.slice(0, 300)}...
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Categories */}
        {activeTab === "categories" && (
          <div className="p-8 max-w-5xl mx-auto w-full space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">Categorías de Conocimiento</h2>
                <p className="text-xs text-slate-500">Administra las etiquetas que clasifican los aprendizajes del agente</p>
              </div>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-sm flex items-center gap-1.5"
              >
                <span>+</span>
                <span>Nueva Categoría</span>
              </button>
            </div>

            {/* Modal para agregar categoría */}
            {showCategoryModal && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-sm text-slate-900">Crear Nueva Categoría</h3>
                    <button
                      onClick={() => setShowCategoryModal(false)}
                      className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                    >
                      &times;
                    </button>
                  </div>

                  <form onSubmit={handleCreateCategory} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Visible</label>
                      <input
                        type="text"
                        required
                        value={catName}
                        onChange={(e) => {
                          setCatName(e.target.value);
                          if (!catSlug) {
                            setCatSlug(e.target.value.toLowerCase().replace(/\s+/g, "_"));
                          }
                        }}
                        placeholder="Ej: Seguridad y Accesos"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Identificador Slug (código único)</label>
                      <input
                        type="text"
                        required
                        value={catSlug}
                        onChange={(e) => setCatSlug(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                        placeholder="Ej: security_access"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Descripción (Opcional)</label>
                      <textarea
                        rows={3}
                        value={catDesc}
                        onChange={(e) => setCatDesc(e.target.value)}
                        placeholder="Describe el tipo de reglas que se agruparán en esta categoría..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(false)}
                        className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingCat}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                      >
                        {isSubmittingCat ? "Creando..." : "Crear Categoría"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Lista de Categorías en Tabla Mapbox */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Nombre</th>
                    <th className="py-3 px-4">Slug / Código</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {c.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                          {c.slug}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {c.description || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteCategory(c.id, c.name)}
                          className="text-slate-400 hover:text-red-600 transition text-xs p-1"
                          title="Eliminar categoría"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
