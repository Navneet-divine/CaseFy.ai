import type OpenAI from 'openai';
import { openai } from './ai.js';

/**
 * Conversation Summary Buffer Memory Configuration
 * - BUFFER_THRESHOLD: Max raw messages to hold in active window before summarization triggers.
 * - EVICT_BATCH_SIZE: How many oldest messages to compress into the summary when threshold is reached.
 */
export const BUFFER_THRESHOLD = 6;
export const EVICT_BATCH_SIZE = 2;

export interface MemoryState {
  userProfile: {
    name?: string;
    [key: string]: any;
  };
  summary: string;
  recentMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
}

// In-Memory state for current conversation
export const memory: MemoryState = {
  userProfile: {},
  summary: '',
  recentMessages: [],
};

/**
 * Extracts key personal user facts (like name) directly from user text so they are never lost.
 */
export function extractUserFacts(content: string): void {
  // Matches "my name is Navneet", "i am Navneet", "call me Navneet"
  const nameMatch = content.match(/\b(?:my name is|i am|call me)\s+([A-Z][a-zA-Z]*)\b/i);
  if (nameMatch && nameMatch[1]) {
    const extractedName = nameMatch[1].trim();
    // Exclude common false positives
    const falsePositives = ['a', 'an', 'the', 'here', 'back', 'asking', 'wondering', 'ready', 'happy', 'trying', 'building'];
    if (!falsePositives.includes(extractedName.toLowerCase())) {
      memory.userProfile.name = extractedName;
      console.log(`\n👤 [Memory] User Name Locked: "${memory.userProfile.name}"`);
    }
  }
}

/**
 * Calls Groq LLM to compress evicted messages into the running summary.
 */
export async function updateSummaryWithEvictedMessages(
  evictedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
): Promise<void> {
  try {
    const evictionText = evictedMessages
      .map((msg) => `${String(msg.role).toUpperCase()}: ${msg.content}`)
      .join('\n');

    const summarizerPrompt = `You are a memory condensation engine for an AI assistant.
Your task is to update the existing conversation summary by merging the newly evicted conversation turns.

Rules:
1. Retain all user personal facts, names, goals, and project details. NEVER drop the user's name if present.
2. Summarize key topics discussed in 2 to 3 concise sentences.
3. Structure your response clearly:
USER FACTS: (e.g., Name: [Name], Project: [Project], etc.)
TOPICS DISCUSSED: (Summary of dialogue)

EXISTING SUMMARY:
${memory.summary ? memory.summary : 'None'}

NEW CONVERSATION TURNS:
${evictionText}

UPDATED SUMMARY:`;

    const response = await openai.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: summarizerPrompt }],
      temperature: 0.2,
      max_tokens: 300,
      stream: false,
    });

    const updatedSummary = response.choices[0]?.message?.content?.trim();
    if (updatedSummary) {
      memory.summary = updatedSummary;

      // Double-check if the summary extracted a name that wasn't caught yet
      const summaryNameMatch = updatedSummary.match(/Name:\s*([A-Z][a-zA-Z]*)/i);
      if (summaryNameMatch && summaryNameMatch[1] && !memory.userProfile.name) {
        memory.userProfile.name = summaryNameMatch[1].trim();
      }

      console.log('\n🧠 [Memory] Rolling Summary Updated:');
      console.log(`"${memory.summary}"\n`);
    }
  } catch (error) {
    console.error('⚠️ [Memory] Failed to generate summary:', error);
  }
}

/**
 * Appends a message to recentMessages and triggers summarization if buffer exceeds threshold.
 */
export async function addMessageAndCompress(
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  // If user message, check for permanent user facts (e.g. name)
  if (role === 'user') {
    extractUserFacts(content);
  }

  memory.recentMessages.push({ role, content });

  // If buffer exceeds threshold, compress oldest messages into running summary
  if (memory.recentMessages.length > BUFFER_THRESHOLD) {
    const messagesToEvict = memory.recentMessages.splice(0, EVICT_BATCH_SIZE);
    console.log(
      `\n📦 [Memory] Buffer reached ${memory.recentMessages.length + messagesToEvict.length} messages. Compressing ${messagesToEvict.length} oldest messages into summary...`
    );
    await updateSummaryWithEvictedMessages(messagesToEvict);
  }
}

/**
 * Injects the running summary and user facts into the system prompt.
 */
export function getAugmentedSystemPrompt(baseSystemPrompt: string): string {
  const sections: string[] = [baseSystemPrompt];

  // 1. Permanent User Facts
  const facts: string[] = [];
  if (memory.userProfile.name) {
    facts.push(`User's Name: ${memory.userProfile.name}`);
  }

  if (facts.length > 0) {
    sections.push(`[PERMANENT USER FACTS]\n${facts.map((f) => `- ${f}`).join('\n')}`);
  }

  // 2. Rolling Prior Conversation Summary
  if (memory.summary) {
    sections.push(`[PRIOR CONVERSATION SUMMARY]\n${memory.summary}`);
  }

  return sections.join('\n\n');
}
