import express from 'express';
import {
  chatHandler,
  getConversations,
  getConversationById,
  deleteConversation,
  renameConversation,
} from '../controllers/chat.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

// All chat and conversation operations require authentication
router.use(isAuthenticated);

// Chat completions & streaming
router.post('/', chatHandler);

// Conversation management
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationById);
router.delete('/conversations/:id', deleteConversation);
router.patch('/conversations/:id', renameConversation);

export default router;
