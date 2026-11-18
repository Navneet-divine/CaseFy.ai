"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, FileText, Loader2, Search, Zap, Sparkles } from "lucide-react";

const mockResponses: { [key: string]: string } = {
  complaint:
    "Based on the complaint document, this civil case involves a dispute regarding breach of contract. The plaintiff alleges that the defendant failed to fulfill their obligations under the agreement signed on January 1, 2024. Key evidence includes the original contract, correspondence between parties, and financial records.",
  discovery:
    "The discovery documents reveal significant communications between the parties. Email chains from February through April show escalating concerns about contract performance. Notable findings include admissions of delayed delivery and discussion of potential remedies.",
  indictment:
    "The official indictment contains multiple counts against the defendant. The charges include fraud, misrepresentation, and conspiracy. The prosecution has presented evidence of intentional misconduct spanning a six-month period.",
  default:
    "Based on the selected documents, the case involves important evidence and legal arguments. The documents contain statements, correspondence, and official records relevant to the case proceedings. Analysis shows key dates, parties involved, and substantive claims.",
};

const exampleQueries = [
  "What differences exist between the two versions of this document?",
  "Summarize the key points in this evidence.",
  "What documents mention phase 2 completion?",
  "Explain the main arguments in this filing.",
];

export function AskLLMInterface() {
  const {
    cases,
    selectedCaseId,
    selectedFileIds,
    chatHistory,
    addMessage,
    toggleFileSelection,
    sendChatMessage,
  } = useApp();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedCase = cases.find((c) => c.id === selectedCaseId);
  // If no case is explicitly selected, fall back to the first case so the
  // chat UI is shown immediately instead of the "Select a case" placeholder.
  const effectiveCase = selectedCase ?? cases[0] ?? null;
  const selectedFiles =
    effectiveCase?.files.filter((f) => selectedFileIds.includes(f.id)) || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  const handleSendMessage = async () => {
    const filesForQuery =
      selectedFiles.length > 0 ? selectedFiles : effectiveCase?.files ?? [];

    if (!input.trim() || (!noCases && filesForQuery.length === 0)) return;

    const currentInput = input;
    const userMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: "user" as const,
      content: currentInput,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMessage);
    setInput("");
    setIsLoading(true);

    try {
      if (!effectiveCase) {
        throw new Error("No active case selected");
      }
      const answer = await sendChatMessage(
        effectiveCase.id,
        selectedFileIds,
        currentInput
      );
      const assistantMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: "assistant" as const,
        content: answer,
        timestamp: new Date().toISOString(),
      };
      addMessage(assistantMessage);
    } catch (err: any) {
      console.error(err);
      const assistantMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: "assistant" as const,
        content: `Sorry, I encountered an error while processing your request: ${err.message || err}`,
        timestamp: new Date().toISOString(),
      };
      addMessage(assistantMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleQuery = (query: string) => {
    setInput(query);
  };

  // If there are no cases at all, show a small notice but still render the UI
  // so users can see and interact with the chat layout.
  const noCases = !effectiveCase;

  return (
    <div className="h-full flex flex-col lg:flex-row gap-0">
      {/* Left Sidebar - Document Selection */}
      <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border bg-muted/30 flex flex-col">
        <div className="p-4 sm:p-6 border-b border-border">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Document Selection
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Select documents for targeted analysis
              </p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6 space-y-4">
            {(effectiveCase?.files.length ?? 0) === 0 ? (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-xs sm:text-sm text-primary">
                  No documents selected. AI will search across all evidence.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(effectiveCase?.files ?? []).map((file) => {
                  const isSelected = selectedFileIds.includes(file.id);
                  return (
                    <div
                      key={file.id}
                      onClick={() => toggleFileSelection(file.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-primary/10 border-primary/50"
                          : "bg-background border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          className="mt-1 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs sm:text-sm text-foreground truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.round(file.size / 1024)} KB
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 sm:p-6 border-t border-border bg-background">
            <p className="text-xs sm:text-sm text-muted-foreground">
              <strong>{selectedFiles.length}</strong> of {" "}
              <strong>{effectiveCase?.files.length ?? 0}</strong> selected
            </p>
        </div>
      </div>

      {/* Right Panel - AI Query */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              AI Query
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Ask questions about your evidence documents
            {noCases ? " — no cases available" : ""}
          </p>
        </div>

        {/* Query Input Section */}
        <div className="p-4 sm:p-6 border-b border-border bg-background">
          <div className="space-y-4">
            <div>
              <label className="text-xs sm:text-sm font-semibold text-foreground block mb-3">
                YOUR QUERY
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    handleSendMessage();
                  }
                }}
                placeholder="Ask a question about the evidence documents..."
                className="w-full min-h-24 sm:min-h-32 p-3 sm:p-4 bg-muted border border-border rounded-lg text-xs sm:text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Example Queries */}
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                Example queries:
              </p>
              <div className="space-y-2">
                {exampleQueries.map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleExampleQuery(query)}
                    className="w-full text-left text-xs sm:text-sm text-primary hover:text-primary/80 transition-colors p-2 rounded hover:bg-primary/5"
                  >
                    • {query}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Options */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted border border-border cursor-pointer hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs sm:text-sm font-medium text-foreground">
                    Search Scope
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">All Documents</p>
              </div>
              <div className="p-3 rounded-lg bg-muted border border-border cursor-pointer hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs sm:text-sm font-medium text-foreground">
                    AI Mode
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Analysis</p>
              </div>
            </div>

            {/* Analyze Button */}
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze with AI
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Response Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-4 sm:p-6 space-y-4">
              {chatHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  <div>
                    <div className="w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Loader2 className="w-6 sm:w-8 h-6 sm:h-8 text-muted-foreground rotate-45" />
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-foreground">
                      No response yet
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                      Select documents (optional) and enter a query, then
                      click Analyze with AI to see results here.
                    </p>
                  </div>
                </div>
              ) : (
                chatHistory.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-md sm:max-w-xl px-4 py-3 rounded-lg text-xs sm:text-sm leading-relaxed ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-muted text-foreground rounded-bl-none border border-border"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="bg-muted text-foreground px-4 py-3 rounded-lg rounded-bl-none flex items-center gap-2 border border-border">
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <p className="text-xs sm:text-sm">Analyzing documents...</p>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
