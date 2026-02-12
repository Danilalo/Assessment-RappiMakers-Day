"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";

const transport = new DefaultChatTransport({ api: "/api/chat" });

function getUIMessageText(msg: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return "";
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

const SUGGESTED_QUESTIONS = [
  "Cual fue el pico maximo de tiendas visibles?",
  "Compara Feb 1 vs Feb 6",
  "Que patron se observa en las ventanas horarias?",
  "Cual ventana tuvo mejor rendimiento?",
];

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  const { messages, sendMessage, status } = useChat({ transport });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const handleSubmit = (text: string) => {
    if (!text.trim() || isStreaming) return;
    sendMessage({ text: text.trim() });
    setInputValue("");
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)]">
          <Card className="flex h-[520px] flex-col overflow-hidden shadow-2xl border-primary/20">
            <CardHeader className="shrink-0 border-b bg-primary/5 px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4 text-primary" />
                Asistente de Datos Rappi
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Pregunta sobre la disponibilidad de tiendas
              </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        Hola! Soy tu asistente de datos. Puedo responder preguntas sobre
                        la disponibilidad de tiendas Rappi. Prueba con alguna de estas:
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleSubmit(q)}
                          className="rounded-full border border-border/50 bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {messages.map((msg) => {
                      const text = getUIMessageText(msg);
                      if (!text) return null;
                      const isUser = msg.role === "user";
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}
                        >
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                              isUser
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isUser ? (
                              <User className="h-3.5 w-3.5" />
                            ) : (
                              <Bot className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div
                            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                              isUser
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/50 text-foreground"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{text}</p>
                          </div>
                        </div>
                      );
                    })}
                    {isStreaming && messages[messages.length - 1]?.role === "user" && (
                      <div className="flex gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Bot className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Analizando datos...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="shrink-0 border-t px-3 py-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit(inputValue);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Escribe tu pregunta..."
                    className="flex-1 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    disabled={isStreaming}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    disabled={!inputValue.trim() || isStreaming}
                  >
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Enviar</span>
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
