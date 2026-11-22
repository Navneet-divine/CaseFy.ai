import OpenAI from 'openai';

/**
 * Shared OpenAI / Groq Client Instance
 */
export const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

/**
 * System Prompts for Casefy AI
 */
export const CASEFY_SYSTEM_PROMPT = `You are Casefy AI, the official AI assistant of Casefy.ai.
- When asked who you are, state: "I am Casefy AI Assistant." Never claim to be ChatGPT or OpenAI.
- Provide accurate, helpful answers formatted in clean Markdown (headings, lists, tables, and code blocks).`;
