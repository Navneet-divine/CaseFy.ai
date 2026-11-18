'use client'

import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, FileText, Loader2 } from 'lucide-react'

// Mock LLM responses based on file content
const mockResponses: { [key: string]: string } = {
  'complaint': 'Based on the complaint document, this civil case involves a dispute regarding breach of contract. The plaintiff alleges that the defendant failed to fulfill their obligations under the agreement signed on January 1, 2024. Key evidence includes the original contract, correspondence between parties, and financial records.',
  'discovery': 'The discovery documents reveal significant communications between the parties. Email chains from February through April show escalating concerns about contract performance. Notable findings include admissions of delayed delivery and discussion of potential remedies.',
  'indictment': 'The official indictment contains multiple counts against the defendant. The charges include fraud, misrepresentation, and conspiracy. The prosecution has presented evidence of intentional misconduct spanning a six-month period.',
  'default': 'Based on the selected documents, the case involves important evidence and legal arguments. The documents contain statements, correspondence, and official records relevant to the case proceedings. Analysis shows key dates, parties involved, and substantive claims.'
}

export function ChatInterface() {
  const { cases, selectedCaseId, selectedFileIds, chatHistory, addMessage, sendChatMessage } = useApp()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectAllFiles, setSelectAllFiles] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const selectedCase = cases.find(c => c.id === selectedCaseId)
  const selectedFiles = selectedCase?.files.filter(f => selectedFileIds.includes(f.id)) || []

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatHistory])

  const handleSendMessage = async () => {
    if (!input.trim()) return
    
    if (!selectedCase) {
      alert('Please select a case first')
      return
    }

    if (selectedFiles.length === 0) {
      alert('Please select at least one file to analyze')
      return
    }

    const currentInput = input
    // Add user message
    const userMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user' as const,
      content: currentInput,
      timestamp: new Date().toISOString()
    }
    addMessage(userMessage)
    setInput('')
    setIsLoading(true)

    try {
      const answer = await sendChatMessage(
        selectedCase.id,
        selectedFileIds,
        currentInput
      )
      const assistantMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant' as const,
        content: answer,
        timestamp: new Date().toISOString()
      }
      addMessage(assistantMessage)
    } catch (err: any) {
      console.error(err)
      const assistantMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant' as const,
        content: `Error occurred: ${err.message || err}`,
        timestamp: new Date().toISOString()
      }
      addMessage(assistantMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!selectedCase) {
    return (
      <Card className="h-full flex items-center justify-center p-6 sm:p-8 text-center border-dashed">
        <div>
          <FileText className="w-10 sm:w-12 h-10 sm:h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground text-sm sm:text-base">Select a case to start asking questions</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* File Selection */}
      <Card className="p-3 sm:p-4 border-b rounded-none">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectAllFiles}
              onCheckedChange={(checked) => {
                setSelectAllFiles(checked as boolean)
                // Toggle all files
              }}
            />
            <span className="text-xs sm:text-sm font-medium">
              Selected Files: {selectedFiles.length}/{selectedCase.files.length}
            </span>
          </div>
          
          {selectedCase.files.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedCase.files.map((file) => (
                <Badge
                  key={file.id}
                  variant={selectedFileIds.includes(file.id) ? 'default' : 'outline'}
                  className="cursor-pointer text-xs sm:text-sm"
                >
                  {file.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground">No files in this case</p>
          )}
        </div>
      </Card>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-4">
          {chatHistory.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 sm:py-12">
              <FileText className="w-10 sm:w-12 h-10 sm:h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base">Ask questions about the selected files</p>
              <p className="text-xs sm:text-sm mt-2">Select files from the case and type your question to get started</p>
            </div>
          ) : (
            chatHistory.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 sm:gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
              <div
                className={`max-w-sm sm:max-w-lg px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm text-xs sm:text-sm ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-muted text-foreground rounded-bl-none border border-border'
                }`}
              >
                <p className="leading-relaxed break-words">{message.content}</p>
                <p className="text-xs mt-2 opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-2 sm:gap-3 justify-start">
              <div className="bg-muted text-foreground px-3 sm:px-4 py-2 sm:py-3 rounded-lg rounded-bl-none flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                <p className="text-xs sm:text-sm">Analyzing documents...</p>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <Card className="p-3 sm:p-4 border-t rounded-none">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about the selected files..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={isLoading || selectedFiles.length === 0}
            className="flex-1 text-sm"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim() || selectedFiles.length === 0}
            size="icon"
            className="flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        {selectedFiles.length === 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Select at least one file to ask questions
          </p>
        )}
      </Card>
    </div>
  )
}
