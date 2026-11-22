import { Request, Response } from 'express';
import type OpenAI from 'openai';
import { openai, CASEFY_SYSTEM_PROMPT } from '../utils/ai.js';

/**
 * Chat Completion Controller (Streaming & Non-Streaming)
 */
export async function chatHandler(req: Request, res: Response) {
  try {
    const { prompt } = req.body;

    // Input Validation
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required and must be a non-empty string.',
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'GROQ_API_KEY is not configured in backend/.env',
      });
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: CASEFY_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: prompt.trim(),
      },
    ];

    res.setHeader('Content-Type', 'text/event-stream');

    const completionStream = await openai.chat.completions.create({
      messages,
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
  } catch (error: any) {
    console.error('Chat Controller Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate response from AI model',
    });
  }
}
