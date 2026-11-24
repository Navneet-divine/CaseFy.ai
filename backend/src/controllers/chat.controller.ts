import { Response } from 'express';
import type OpenAI from 'openai';
import prisma from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { openai, CASEFY_SYSTEM_PROMPT } from '../utils/ai.js';
import {
  BUFFER_THRESHOLD,
  generateChatTitle,
  extractUserName,
  updateSummaryWithEvictedMessages,
  getAugmentedSystemPrompt,
} from '../utils/memory.js';

/**
 * Chat Completion Controller with Summary Buffer Memory persisted in PostgreSQL.
 * Streams SSE response and saves conversation + messages to the database.
 */
export async function chatHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { prompt, conversationId } = req.body;

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
        error: 'GROQ_API_KEY is not configured in backend environment.',
      });
    }

    // 1. Find or create the conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: generateChatTitle(prompt),
        },
        include: {
          messages: true,
        },
      });
    }

    // 2. Save the user's message to the database
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: prompt.trim(),
      },
    });

    // 3. User info for facts extraction
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    const userName = extractUserName(prompt) || user?.fullName || undefined;

    // 4. Memory condensation / sliding window buffer
    // All messages up to this turn
    const allHistory = [...conversation.messages, userMessage];
    let currentSummary = conversation.summary;

    let recentMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;

    if (allHistory.length > BUFFER_THRESHOLD) {
      const messagesToCondense = allHistory.slice(0, allHistory.length - BUFFER_THRESHOLD);
      recentMessages = allHistory.slice(-BUFFER_THRESHOLD).map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      // Condense older messages into rolling summary asynchronously
      try {
        currentSummary = await updateSummaryWithEvictedMessages(currentSummary, messagesToCondense);
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { summary: currentSummary },
        });
      } catch (sumErr) {
        console.error('Failed to update summary in background:', sumErr);
      }
    } else {
      recentMessages = allHistory.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));
    }

    // 5. Build messages payload for Groq
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: getAugmentedSystemPrompt(CASEFY_SYSTEM_PROMPT, currentSummary, userName),
      },
      ...recentMessages,
    ];

    // 6. Set up SSE streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Notify client of the active conversation ID & title
    res.write(
      `data: ${JSON.stringify({
        type: 'meta',
        conversationId: conversation.id,
        title: conversation.title,
      })}\n\n`
    );

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

    // 7. Persist assistant response to PostgreSQL
    if (fullAssistantResponse.trim()) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: fullAssistantResponse.trim(),
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
    }

    // Signal completion
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error('chatHandler error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
}

/**
 * List all conversations for the authenticated user (for sidebar history)
 */
export async function getConversations(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    res.status(200).json({ conversations });
  } catch (error) {
    console.error('getConversations error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Get a specific conversation and all of its messages (for loading past chat)
 */
export async function getConversationById(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const id = req.params.id as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.status(200).json({ conversation });
  } catch (error) {
    console.error('getConversationById error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Delete a conversation (messages cascade delete)
 */
export async function deleteConversation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const id = req.params.id as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await prisma.conversation.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('deleteConversation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Rename a conversation title
 */
export async function renameConversation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const id = req.params.id as string;
    const { title } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { title: title.trim() },
    });

    res.status(200).json({ conversation: updated });
  } catch (error) {
    console.error('renameConversation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
