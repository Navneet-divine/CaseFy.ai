"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
  Clock,
  ChevronRight,
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

interface ConversationItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
}

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
const API_BASE = rawApiUrl.replace(/\/api\/?$/, "");

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

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

interface AIChatbotProps {
  conversationId?: string;
}

export function AIChatbot({ conversationId: propConvId }: AIChatbotProps = {}) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const openHistoryParam = searchParams.get("history");
  const convIdParam = searchParams.get("id");
  const targetConvId = (params?.id as string | undefined) || propConvId || convIdParam || null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // History & Conversation States from AppContext
  const {
    conversations,
    isLoadingConversations,
    fetchConversations,
    setConversations,
  } = useApp();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationTitle, setActiveConversationTitle] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isFetchingChat, setIsFetchingChat] = useState<boolean>(Boolean(targetConvId));

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadedIdRef = useRef<string | null>(null);

  // Load a past conversation
  const loadConversation = useCallback(async (convId: string, updateUrl: boolean = true) => {
    try {
      setIsFetchingChat(true);
      setIsLoading(true);
      const res = await axios.get(`${API_BASE}/api/chat/conversations/${convId}`, {
        withCredentials: true,
      });

      const conv = res.data.conversation;
      if (conv) {
        setActiveConversationId(conv.id);
        setActiveConversationTitle(conv.title);

        const loadedMessages: Message[] = (conv.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));

        setMessages(loadedMessages);
        setIsHistoryOpen(false);
        if (updateUrl) {
          window.history.replaceState(null, "", `/chatbot/${conv.id}`);
        }
      }
    } catch (err: any) {
      console.error("Failed to load conversation:", err);
      toast.error(err?.response?.data?.error || "Failed to load conversation");
      window.history.replaceState(null, "", "/chatbot");
    } finally {
      setIsLoading(false);
      setIsFetchingChat(false);
    }
  }, []);

  // Load conversation on mount or when route / param changes
  useEffect(() => {
    if (targetConvId) {
      if (loadedIdRef.current !== targetConvId) {
        loadedIdRef.current = targetConvId;
        loadConversation(targetConvId, false);
      }
    } else {
      loadedIdRef.current = null;
      setActiveConversationId(null);
      setActiveConversationTitle(null);
      setMessages([]);
    }
  }, [targetConvId, loadConversation]);

  // Open history drawer if query param ?history=true is present
  useEffect(() => {
    if (openHistoryParam === "true") {
      setIsHistoryOpen(true);
    }
  }, [openHistoryParam]);

  // Load conversations whenever history sheet opens
  useEffect(() => {
    if (isHistoryOpen) {
      fetchConversations();
    }
  }, [isHistoryOpen, fetchConversations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Delete a conversation
  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      setIsDeletingId(convId);
      await axios.delete(`${API_BASE}/api/chat/conversations/${convId}`, {
        withCredentials: true,
      });

      setConversations((prev) => prev.filter((c) => c.id !== convId));
      toast.success("Conversation deleted");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("chat-updated"));
      }

      // If active conversation was deleted, reset chat window and navigate to /chatbot
      if (activeConversationId === convId) {
        setActiveConversationId(null);
        setActiveConversationTitle(null);
        setMessages([]);
        router.push("/chatbot");
      }
    } catch (err: any) {
      console.error("Failed to delete conversation:", err);
      toast.error(err?.response?.data?.error || "Failed to delete conversation");
    } finally {
      setIsDeletingId(null);
    }
  };

  // Start a new chat
  const startNewChat = () => {
    loadedIdRef.current = null;
    setActiveConversationId(null);
    setActiveConversationTitle(null);
    setMessages([]);
    setIsFetchingChat(false);
    setIsHistoryOpen(false);
    router.push("/chatbot");
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
        body: JSON.stringify({
          prompt: textToSend,
          conversationId: activeConversationId || undefined,
        }),
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

            // Handle metadata sent at the start of stream (conversationId & title)
            if (parsed.type === "meta" && parsed.conversationId) {
              loadedIdRef.current = parsed.conversationId;
              setActiveConversationId(parsed.conversationId);
              if (parsed.title) {
                setActiveConversationTitle(parsed.title);
              }
              // Immediately sync the conversation ID to the URL path so refresh retains the conversation
              window.history.replaceState(null, "", `/chatbot/${parsed.conversationId}`);
            }

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
            // ignore partial json parse errors
          }
        }
      }

      // Re-fetch conversations list so latest conversation / message count updates
      fetchConversations(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("chat-updated"));
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
      setIsFetchingChat(false);
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
              <h1 className="font-semibold text-foreground text-sm md:text-base tracking-tight">
                AI Chatbot
              </h1>
              <Badge
                variant="outline"
                className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Groq Free Tier
              </Badge>
              {activeConversationTitle && (
                <Badge
                  variant="secondary"
                  className="hidden md:inline-flex text-[11px] max-w-[200px] truncate"
                  title={activeConversationTitle}
                >
                  {activeConversationTitle}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              ChatGPT-style conversational assistant with persistent memory & history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* History Arrow Drawer Button */}
          <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 h-8 border-border hover:bg-accent/60 group"
                title="View Conversation History"
              >
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>History</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="left"
              className="w-[320px] sm:w-[380px] p-0 flex flex-col bg-card border-r border-border"
            >
              <SheetHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
                <SheetTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  Chat History
                </SheetTitle>
                <Button
                  size="sm"
                  variant="default"
                  onClick={startNewChat}
                  className="text-xs gap-1.5 h-8 mr-6"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Chat
                </Button>
              </SheetHeader>

              {/* Conversation List */}
              <ScrollArea className="flex-1 p-3">
                {isLoadingConversations ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-xs">Loading conversations...</span>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-12 px-4 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium text-foreground">No conversations yet</p>
                    <p className="text-xs mt-1">Start chatting to automatically save your history.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {conversations.map((conv) => {
                      const isActive = activeConversationId === conv.id;
                      const isDeleting = isDeletingId === conv.id;

                      return (
                        <div
                          key={conv.id}
                          onClick={() => loadConversation(conv.id)}
                          className={`group relative flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            isActive
                              ? "bg-primary/10 border-primary/30 text-foreground shadow-xs"
                              : "border-transparent hover:bg-accent/60 hover:border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0 pr-6">
                            <MessageSquare
                              className={`w-4 h-4 mt-0.5 shrink-0 ${
                                isActive ? "text-primary" : "text-muted-foreground"
                              }`}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate leading-tight">
                                {conv.title || "Untitled Chat"}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/80">
                                <span>{formatRelativeTime(conv.updatedAt)}</span>
                                {conv._count?.messages ? (
                                  <>
                                    <span>•</span>
                                    <span>{conv._count.messages} msgs</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteConversation(e, conv.id)}
                            disabled={isDeleting}
                            className="opacity-0 group-hover:opacity-100 size-7 shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-opacity"
                            title="Delete conversation"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* New Chat Button in header */}
          <Button
            variant="outline"
            size="sm"
            onClick={startNewChat}
            className="text-xs gap-1.5 text-muted-foreground hover:text-foreground h-8"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        </div>
      </header>

      {/* Chat Messages Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-6">
        {isFetchingChat ? (
          /* Message Skeletons while conversation is loading from database */
          <div className="w-full px-4 md:px-8 space-y-6 animate-in fade-in-50 duration-200">
            {/* User turn skeleton */}
            <div className="flex gap-3 md:gap-4 w-full justify-end">
              <div className="space-y-2 max-w-[70%] md:max-w-[45%] flex flex-col items-end">
                <Skeleton className="h-10 w-48 rounded-2xl rounded-br-none bg-primary/20" />
                <Skeleton className="h-2.5 w-12 rounded-sm" />
              </div>
              <Skeleton className="w-8 h-8 rounded-lg shrink-0 mt-0.5" />
            </div>

            {/* Assistant turn skeleton */}
            <div className="flex gap-3 md:gap-4 w-full justify-start">
              <Skeleton className="w-8 h-8 rounded-lg shrink-0 mt-0.5" />
              <div className="space-y-2 max-w-[80%] md:max-w-[65%] w-full">
                <div className="p-4 rounded-2xl rounded-bl-none border border-border bg-card/60 space-y-3">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-5/6 rounded" />
                  <div className="pt-2 flex gap-2">
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Second User turn skeleton */}
            <div className="flex gap-3 md:gap-4 w-full justify-end">
              <div className="space-y-2 max-w-[70%] md:max-w-[40%] flex flex-col items-end">
                <Skeleton className="h-10 w-56 rounded-2xl rounded-br-none bg-primary/20" />
                <Skeleton className="h-2.5 w-12 rounded-sm" />
              </div>
              <Skeleton className="w-8 h-8 rounded-lg shrink-0 mt-0.5" />
            </div>

            {/* Second Assistant turn skeleton */}
            <div className="flex gap-3 md:gap-4 w-full justify-start">
              <Skeleton className="w-8 h-8 rounded-lg shrink-0 mt-0.5" />
              <div className="space-y-2 max-w-[80%] md:max-w-[60%] w-full">
                <div className="p-4 rounded-2xl rounded-bl-none border border-border bg-card/60 space-y-3">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-4/5 rounded" />
                  <Skeleton className="h-4 w-1/2 rounded" />
                </div>
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center text-center space-y-8 py-12 px-2">
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto shadow-inner text-primary">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                How can I assist you today?
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Ready to explore production AI concepts: multi-turn memory, high-speed Groq inference, and persistent history.
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
                  className={`flex gap-3 md:gap-4 w-full ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`group relative max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-xs ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-card border border-border rounded-bl-none"
                    }`}
                  >
                    {isUser ? (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    ) : (
                      <div className="space-y-2">
                        {message.content ? (
                          <MarkdownRenderer content={message.content} />
                        ) : (
                          <div className="flex items-center gap-1.5 py-1">
                            <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
                            <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0.2s]" />
                            <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0.4s]" />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4 mt-2 pt-1 border-t border-border/20 text-[10px] text-muted-foreground/80">
                      <span>{message.timestamp}</span>
                      {!isUser && message.content && (
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground flex items-center gap-1"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-foreground shrink-0 mt-0.5">
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
      <footer className="shrink-0 p-4 md:p-6 bg-background/80 backdrop-blur-md border-t border-border">
        <div className="max-w-4xl mx-auto space-y-2">
          <div className="relative flex items-center bg-card border border-border rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all p-1.5">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or request a task... (Press Enter to send, Shift+Enter for new line)"
              rows={1}
              className="resize-none border-0 shadow-none focus-visible:ring-0 text-sm max-h-36 min-h-[44px] py-2.5 px-3 bg-transparent text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex items-center gap-1 px-2">
              <Button
                size="icon"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className="w-8 h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between px-2 text-[11px] text-muted-foreground">
            <span>Powered by Groq API • GPT-OSS 120B</span>
            <span className="hidden sm:inline">Tools (Search, PPT, Image) coming next</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
