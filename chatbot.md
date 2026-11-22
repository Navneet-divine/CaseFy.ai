# Production-Ready AI Chatbot Architecture

Welcome to the development log and architecture guide for the **AI Chatbot** in CaseFy.ai. This document tracks our progression from a simple LLM prompt-response cycle to a full autonomous multi-tool agent with persistent memory.

---

## 🗺️ Progressive Learning Roadmap

| Status | Topic | Description |
| :---: | :--- | :--- |
| ✅ | **1. LLM Responses & Real-Time Streaming** | Base Prompt $\rightarrow$ Response, real-time SSE token streaming, ChatGPT-grade Markdown (tables, copyable code blocks), clean MVC controller & routes, custom Casefy AI identity. |
| ⏳ | **2. Context Window & Exceeding Limits** | Understanding context length, token counting, detecting and handling max token exceed errors, and truncation strategies. |
| ⏳ | **3. Conversation Memory** | Multi-turn chat history buffer, persistent database sessions, sliding-window retention, and automatic context summarization. |
| ⏳ | **4. Real-Time Tools & Function Calling** | Live Web Search tool, PPT presentation generator, Image generation, and autonomous tool-calling execution loops. |
| ⏳ | **5. Production Hardening** | Input guardrails, Zod schema validation, rate-limit retries, and fallback handling. |

---

## ⚡ Tech Stack & Architecture

- **LLM Provider:** [Groq Cloud](https://console.groq.com/) (Free Tier, ultra-fast inference).
- **Active Model:** `openai/gpt-oss-120b` (High-parameter open model running on Groq inference).
- **Backend Architecture (Clean MVC):**
  - **AI Utilities:** [`backend/src/utils/ai.ts`](file:///Users/navneetkushwaha/Developers/CaseFy.ai/backend/src/utils/ai.ts) (Configures the OpenAI client instance and exports `CASEFY_SYSTEM_PROMPT`).
  - **Controller:** [`backend/src/controllers/chat.controller.ts`](file:///Users/navneetkushwaha/Developers/CaseFy.ai/backend/src/controllers/chat.controller.ts) (Handles streaming loop, validation, and completions).
  - **Router:** [`backend/src/routes/chat.routes.ts`](file:///Users/navneetkushwaha/Developers/CaseFy.ai/backend/src/routes/chat.routes.ts) (Mounted at `/api/chat`).
- **Frontend Stack:**
  - Next.js (App Router), React, Tailwind CSS.
  - Markdown Engine: `react-markdown` + `remark-gfm` with custom `CodeBlock` component (dark theme + one-click copy).
  - Navigation: Shadcn collapsible sidebar with interactive user dropdown profile.

---

## 🎭 System Prompt & Client Setup ([`backend/src/utils/ai.ts`](file:///Users/navneetkushwaha/Developers/CaseFy.ai/backend/src/utils/ai.ts))

To keep the controller ultra-clean, the OpenAI instance and system prompt are centralized:

```typescript
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

export const CASEFY_SYSTEM_PROMPT = `You are Casefy AI, the official AI assistant of Casefy.ai.
- When asked who you are, state: "I am Casefy AI Assistant." Never claim to be ChatGPT or OpenAI.
- Provide accurate, helpful answers formatted in clean Markdown (headings, lists, tables, and code blocks).`;
```

---

## 🌊 Real-Time Streaming Architecture

In [`backend/src/controllers/chat.controller.ts`](file:///Users/navneetkushwaha/Developers/CaseFy.ai/backend/src/controllers/chat.controller.ts), the handler streams tokens via Server-Sent Events:

```typescript
// Streaming Mode
if (stream) {
  res.setHeader('Content-Type', 'text/event-stream');

  const completionStream = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: CASEFY_SYSTEM_PROMPT },
      { role: 'user', content: prompt.trim() },
    ],
    model: 'openai/gpt-oss-120b',
    temperature: 0.7,
    max_tokens: 2048,
    stream: true,
  });

  for await (const chunk of completionStream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if (delta) {
      res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  return res.end();
}
```

On the frontend ([`frontend/components/AIChatbot.tsx`](file:///Users/navneetkushwaha/Developers/CaseFy.ai/frontend/components/AIChatbot.tsx)), `fetch` reads incoming chunks through `ReadableStreamDefaultReader` and appends tokens to state in real time.

---

## 🔌 API Contract

### `POST /api/chat`

#### Request Body
```json
{
  "prompt": "Who are you?"
}
```

#### Stream Chunks Response (SSE)
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream

data: {"content":"I"}

data: {"content":" am"}

data: {"content":" Casefy"}

data: {"content":" AI"}

data: [DONE]
```

---

## 📊 Current Progress & Next Steps

### ✅ Completed Topics:
- **LLM Responses & Generation:**
  - Integrated OpenAI SDK with Groq's high-speed inference engine (`openai/gpt-oss-120b`).
  - Implemented real-time token streaming using Server-Sent Events (SSE).
  - Built ChatGPT-style UI with rich Markdown, tables, and copyable dark-theme code blocks.
  - Architected modular MVC structure ([`ai.ts`](file:///Users/navneetkushwaha/Developers/CaseFy.ai/backend/src/utils/ai.ts) $\rightarrow$ [`chat.controller.ts`](file:///Users/navneetkushwaha/Developers/CaseFy.ai/backend/src/controllers/chat.controller.ts) $\rightarrow$ [`chat.routes.ts`](file:///Users/navneetkushwaha/Developers/CaseFy.ai/backend/src/routes/chat.routes.ts)).
  - Injected dedicated Casefy AI Assistant system persona.

---

### ⏳ Upcoming Topics (In Order):
1. **Context Window & Exceeding Limits:**
   - Understanding token limits and model context boundaries.
   - Detecting and handling token overflow errors before adding conversation history.
   - Truncation and token management strategies.

2. **Conversation Memory:**
   - Multi-turn conversation buffer (`messages: [...]`).
   - Session storage & database persistence.
   - Sliding-window context retention and automated summarization.

3. **Tool Calling & Agentic AI (Function Calling):**
   - **How Tool Calling Works:** Model receives tool schemas $\rightarrow$ decides whether to call a tool $\rightarrow$ returns JSON arguments $\rightarrow$ backend executes local function $\rightarrow$ feeds output back to model for final response.
   - **Tools to Build:**
     - 🔍 **Real-Time Web Search Tool:** Querying live external facts via search API.
     - 📊 **PowerPoint (PPT) Generation Tool:** Generating downloadable `.pptx` presentations on demand.
     - 🎨 **Image Generation Tool:** Generating visual diagrams and illustrations via free inference.
   - **Agentic ReAct Loop:** Multi-step reasoning where the model can call multiple tools in sequence before answering.

4. **Production Hardening:**
   - Guardrails against prompt injections.
   - Zod schema validation for tool parameters.
   - Rate limit retries and fallback handling.
