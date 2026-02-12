"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Loader2 } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  chartJson?: string; // plotly JSON
}

const SUGGESTED_QUESTIONS = [
  "Cual fue el pico maximo de tiendas visibles?",
  "Muestra la tendencia de disponibilidad por hora",
  "Compara los dias con mejor y peor disponibilidad",
  "Que patron se observa en las horas pico?",
];

interface ChatbotProps {
  onChartUpdate?: (chartJson: string | null) => void;
}

export function Chatbot({ onChartUpdate }: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSubmit = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.text }));
      const res = await fetch(`/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text.trim(), chat_history: history }),
      });
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: data.explanation || data.error || "Sin respuesta",
        chartJson: data.chart_json || undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (data.chart_json && onChartUpdate) onChartUpdate(data.chart_json);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", text: "Error al conectar con el backend." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, onChartUpdate]);

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="shrink-0 border-b bg-primary/5 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bot className="h-4 w-4 text-primary" />
          Asistente de Datos Rappi
        </CardTitle>
        <p className="text-xs text-muted-foreground">Pregunta sobre la disponibilidad de tiendas</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Hola! Soy tu asistente de datos. Puedo responder preguntas y generar graficos sobre tiendas Rappi.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button key={q} onClick={() => handleSubmit(q)}
                    className="rounded-full border border-border/50 bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground"}`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Analizando datos...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t px-3 py-3">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(inputValue); }} className="flex items-center gap-2">
            <input value={inputValue} onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe tu pregunta..."
              className="flex-1 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              disabled={loading} />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!inputValue.trim() || loading}>
              <Send className="h-4 w-4" /><span className="sr-only">Enviar</span>
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
