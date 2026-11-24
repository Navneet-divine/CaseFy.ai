import { openai } from './ai.js';

/**
 * Conversation Summary Buffer Memory Configuration
 * - BUFFER_THRESHOLD: Number of recent raw messages to retain in the prompt.
 * - Any messages older than the BUFFER_THRESHOLD are compressed into the summary.
 */
export const BUFFER_THRESHOLD = 6;

/**
 * Generates a clean, user-friendly title from the first prompt (like ChatGPT)
 */
export function generateChatTitle(prompt: string): string {
  const cleaned = prompt.trim().replace(/\s+/g, ' ');
  const words = cleaned.split(' ');
  if (words.length <= 6) {
    return cleaned.slice(0, 50);
  }
  return words.slice(0, 6).join(' ').slice(0, 50) + '...';
}

/**
 * Extracts key personal user facts (like name) directly from user text so they are never lost.
 */
export function extractUserName(content: string): string | null {
  const nameMatch = content.match(/\b(?:my name is|i am|call me)\s+([A-Z][a-zA-Z]*)\b/i);
  if (nameMatch && nameMatch[1]) {
    const extractedName = nameMatch[1].trim();
    const falsePositives = [
      'a', 'an', 'the', 'here', 'back', 'asking', 'wondering',
      'ready', 'happy', 'trying', 'building', 'user', 'guest'
    ];
    if (!falsePositives.includes(extractedName.toLowerCase())) {
      return extractedName;
    }
  }
  return null;
}

/**
 * Condenses evicted messages into the running summary using Groq LLM.
 */
export async function updateSummaryWithEvictedMessages(
  existingSummary: string | null | undefined,
  messagesToEvict: Array<{ role: string; content: string }>
): Promise<string> {
  if (messagesToEvict.length === 0) {
    return existingSummary || '';
  }

  try {
    const evictionText = messagesToEvict
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');

    const summarizerPrompt = `You are a memory condensation engine for an AI assistant.
Your task is to update the existing conversation summary by merging the newly evicted conversation turns.

Rules:
1. Retain all user personal facts, names, goals, and key details. NEVER drop the user's name if present.
2. Summarize key topics discussed in 2 to 3 concise sentences.
3. Structure your response clearly:
USER FACTS: (e.g., Name: [Name], Goals: [Goals], etc.)
TOPICS DISCUSSED: (Summary of dialogue)

EXISTING SUMMARY:
${existingSummary || 'None'}

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

    const updated = response.choices[0]?.message?.content?.trim();
    return updated || existingSummary || '';
  } catch (error) {
    console.error('⚠️ [Memory] Failed to generate summary:', error);
    return existingSummary || '';
  }
}

/**
 * Injects the running summary and user facts into the system prompt.
 */
export function getAugmentedSystemPrompt(
  baseSystemPrompt: string,
  summary?: string | null,
  userName?: string | null
): string {
  const sections: string[] = [baseSystemPrompt];

  // 1. Permanent User Facts
  const facts: string[] = [];
  if (userName) {
    facts.push(`User's Name: ${userName}`);
  }

  if (facts.length > 0) {
    sections.push(`[PERMANENT USER FACTS]\n${facts.map((f) => `- ${f}`).join('\n')}`);
  }

  // 2. Rolling Prior Conversation Summary
  if (summary && summary.trim()) {
    sections.push(`[PRIOR CONVERSATION SUMMARY]\n${summary.trim()}`);
  }

  return sections.join('\n\n');
}
