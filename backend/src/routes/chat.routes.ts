import express from 'express';
import { chatHandler } from '../controllers/chat.controller.js';

const router = express.Router();

// POST /api/chat or POST /api/chat/message
router.post('/', chatHandler);

export default router;
