import express from 'express';
import { chatHandler } from '../controllers/chat.controller.js';

const router = express.Router();

// POST /api/chat - Send prompt & stream AI response with history
router.post('/', chatHandler);

export default router;
