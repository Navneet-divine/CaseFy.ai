"use client";

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  Bot,
  User,
  Send,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Zap,
  Cpu,
  Search,
  Presentation,
  Image as ImageIcon,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
const API_BASE = rawApiUrl.replace(/\/api\/?$/, "");

const STARTER_PROMPTS = [
  {
    title: "Explain AI Agent Architecture",
    prompt: "Can you explain how AI agents plan, maintain memory, and execute tools in production systems?",
    icon: Cpu,
  },
  {
    title: "Compare RAG vs Agentic Workflows",
    prompt: "What is the difference between standard naive RAG and Agentic RAG with iterative search tools?",
    icon: Search,
  },
  {
    title: "Draft a Presentation Outline",
    prompt: "Draft a 5-slide deck outline on 'Future of Autonomous AI Workflows' in clean markdown.",
    icon: Sparkles,
  },
  {
    title: "System Design for AI Chatbot",
    prompt: "Design a high-scale, production-ready AI chatbot architecture supporting streaming, memory, and tool calls.",
    icon: Zap,
  },
];

export function AIChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    if (window.confirm("Are you sure you want to clear the conversation?")) {
      setMessages([]);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();

    try {
      // Create initial empty assistant message to receive real-time stream
      const initialAssistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, initialAssistantMessage]);

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: textToSend }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Readable stream is not supported in this browser.");
      }

      let accumulatedContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          const dataContent = trimmed.replace(/^data:\s*/, "");
          if (dataContent === "[DONE]") {
            break;
          }

          try {
            const parsed = JSON.parse(dataContent);
            if (parsed.content) {
              accumulatedContent += parsed.content;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              );
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            // ignore partial json chunk parse errors
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to stream message", err);
      const errorMsg =
        err?.message ||
        "Sorry, an error occurred while generating the response. Please check your Groq API key and try again.";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: `⚠️ ${errorMsg}` }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-foreground text-sm md:text-base tracking-tight">AI Chatbot</h1>
              <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Groq Free Tier
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">ChatGPT-style conversational assistant with upcoming tool calling</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              className="text-xs gap-1.5 text-muted-foreground hover:text-foreground h-8"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Chat
            </Button>
          )}
        </div>
      </header>

      {/* Chat Messages Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center text-center space-y-8 py-12 px-2">
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto shadow-inner text-primary">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                How can I assist you today?
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Ready to explore production AI concepts: multi-turn memory, high-speed Groq inference, and autonomous tool calling.
              </p>
            </div>

            {/* Quick Starter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
              {STARTER_PROMPTS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="p-4 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/40 transition-all duration-200 group flex flex-col justify-between space-y-2 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {item.title}
                      </span>
                      <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.prompt}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="w-full px-4 md:px-8 space-y-6">
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 md:gap-4 w-full ${isUser ? "justify-end" : "justify-start"
                    }`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 mt-1 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`group relative rounded-2xl px-5 py-3.5 shadow-sm ${isUser
                      ? "max-w-[85%] sm:max-w-[70%] md:max-w-[55%] bg-primary text-primary-foreground rounded-tr-sm"
                      : "flex-1 max-w-[98%] bg-card border border-border text-foreground rounded-tl-sm"
                      }`}
                  >
                    {/* Top Right Copy Button */}
                    {message.content && (
                      <button
                        onClick={() => handleCopy(message.id, message.content)}
                        className={`absolute top-2.5 right-2.5 flex items-center gap-1 text-[11px] py-1 px-2 rounded-lg transition-colors cursor-pointer z-10 ${isUser
                          ? "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/15"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        title={isUser ? "Copy prompt" : "Copy response"}
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className={`w-3.5 h-3.5 ${isUser ? "text-emerald-300" : "text-emerald-500"}`} />
                            <span className={isUser ? "text-emerald-300 font-medium" : "text-emerald-500 font-medium"}>
                              Copied
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}

                    <div className="pr-16">
                      {isUser ? (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
                        </div>
                      ) : message.content ? (
                        <MarkdownRenderer content={message.content} />
                      ) : (
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex items-center justify-end mt-2 pt-1 text-[10px] ${isUser
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                        }`}
                    >
                      <span>{message.timestamp}</span>
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-secondary-foreground flex-shrink-0 mt-1 shadow-sm">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-3 md:p-4 border-t border-border bg-card/40 backdrop-blur-sm">
        <div className="w-full px-4 md:px-8 space-y-2">
          <div className="relative flex items-center border border-border rounded-2xl bg-background shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or request a task... (Press Enter to send, Shift+Enter for new line)"
              rows={1}
              className="resize-none min-h-[52px] max-h-36 py-3.5 px-4 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            />
            <div className="pr-3 flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className="h-9 w-9 p-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between px-2 text-[11px] text-muted-foreground">
            <span>Powered by Groq API • GPT-OSS 120B</span>
            <span>Tools (Search, PPT, Image) coming next</span>
          </div>
        </div>
      </div>
    </div>
  );
}
