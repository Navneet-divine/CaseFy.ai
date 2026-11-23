# Production-Ready AI Chatbot Architecture

Welcome to the development log and architecture guide for the **AI Chatbot** in CaseFy.ai. This document tracks our progression from a simple LLM prompt-response cycle to a full autonomous multi-tool agent with persistent memory.

---

## 🗺️ Progressive Learning Roadmap

| Status | Topic | Description |
| :---: | :--- | :--- |
| ✅ | **1. LLM Responses & Real-Time Streaming** | Base Prompt $\rightarrow$ Response, real-time SSE token streaming, ChatGPT-grade Markdown (tables, copyable code blocks), clean MVC controller & routes, custom Casefy AI identity. |
| ✅ | **2. Conversation Summary Buffer Memory** | Hybrid ChatGPT-style memory: active sliding window (6 recent messages) + automatic LLM compression of older dialogue into a running summary injected into system prompt. |
| ⏳ | **3. Context Window Boundaries & Token Exceed Limits** | Token calculations for `openai/gpt-oss-120b`, overflow detection, automatic message truncation and compaction. |
| ⏳ | **4. Database Session Persistence** | Persisting multi-session conversations and summaries in MongoDB via Prisma. |
| ⏳ | **5. Real-Time Tools & Function Calling** | Live Web Search tool, PPT presentation generator, Image generation, and autonomous tool-calling execution loops. |
| ⏳ | **6. Production Hardening** | Input guardrails, Zod schema validation, rate-limit retries, and fallback handling. |

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

## 🧠 Multi-Turn Memory Architecture (Summary Buffer + User Facts)

### Why Stateless LLMs Need Memory Management
Large Language Models have **zero memory** across HTTP requests. In a naive implementation, you must re-send every past message on every turn. However, sending 20–50 full raw messages causes:
1. **TPM (Tokens Per Minute) Exhaustion:** Rapidly hits Groq Free-Tier rate limits (`429 Too Many Requests`).
2. **Latency Bloat:** Slower time-to-first-token as prompt payload multiplies.
3. **Lossy Compression / "Lost in the Middle":** Without structured retention, naive text summarization drops vital user details like names or project goals.

---

### The Three-Tier Memory Model ([`backend/src/utils/memory.ts`](file:///Users/navneetkushwaha/Developers/CaseFy.ai/backend/src/utils/memory.ts))

We implemented a production-grade **Hybrid Summary Buffer Memory** inspired by ChatGPT:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. PERMANENT USER FACTS (Zero-Loss Store)                              │
│    - Extracted personal entities: e.g. "User's Name: Navneet"          │
│    - Immune to deletion, sliding windows, or summarization loss        │
├────────────────────────────────────────────────────────────────────────┤
│ 2. ROLLING CONVERSATION SUMMARY (Background Condensation)              │
│    - Condensed 2-3 sentence overview of older dialogue topics          │
│    - Structured: USER FACTS + TOPICS DISCUSSED                         │
├────────────────────────────────────────────────────────────────────────┤
│ 3. ACTIVE SLIDING WINDOW BUFFER (Last 6 Raw Messages)                  │
│    - Recent conversation turns verbatim                                │
│    - Keeps exact code blocks, syntax, and immediate conversational tone│
└────────────────────────────────────────────────────────────────────────┘
```

#### How It Works Step-by-Step:
1. **Fact Extraction:** When the user shares personal details (e.g., *"My name is Navneet"*), `extractUserFacts()` locks this entity into `memory.userProfile.name`.
2. **Buffer Ingestion:** Every new user and assistant message enters `memory.recentMessages`.
3. **Sliding Window & Eviction:** When `recentMessages.length > 6` (`BUFFER_THRESHOLD`), the 2 oldest messages are evicted from the array.
4. **Asynchronous Compression:** Before the evicted messages are discarded, Groq runs a lightweight background call (`updateSummaryWithEvictedMessages()`) to merge their core takeaways into `memory.summary`.
5. **Prompt Augmentation:** `getAugmentedSystemPrompt()` packages the base system prompt, permanent facts, and running summary together into the system role before calling Groq.

```typescript
// Prompt Construction Sent to Groq:
const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  {
    role: 'system',
    content: getAugmentedSystemPrompt(CASEFY_SYSTEM_PROMPT),
  },
  ...memory.recentMessages,
];
```

---

## 🌊 Real-Time Streaming Controller ([`backend/src/controllers/chat.controller.ts`](file:///Users/navneetkushwaha/Developers/CaseFy.ai/backend/src/controllers/chat.controller.ts))

The controller is clean, decoupled from memory logic, and streams SSE tokens in real time:

```typescript
export async function chatHandler(req: Request, res: Response) {
  try {
    const { prompt } = req.body;

    // 1. Add user query to memory (auto-compresses if buffer exceeds 6)
    await addMessageAndCompress('user', prompt.trim());

    // 2. Build payload with Augmented System Prompt + Recent Buffer
    const messages = [
      { role: 'system', content: getAugmentedSystemPrompt(CASEFY_SYSTEM_PROMPT) },
      ...memory.recentMessages,
    ];

    res.setHeader('Content-Type', 'text/event-stream');

    const completionStream = await openai.chat.completions.create({
      messages,
      model: 'openai/gpt-oss-120b',
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    });

    let fullAssistantResponse = '';
    for await (const chunk of completionStream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullAssistantResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    // 3. Save assistant response into memory
    if (fullAssistantResponse) {
      await addMessageAndCompress('assistant', fullAssistantResponse);
    }

    res.write('data: [DONE]\n\n');
    return res.end();
  } catch (error: any) {
    console.error('Chat Controller Error:', error);
    return res.status(500).json({ success: false, error: error?.message });
  }
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
