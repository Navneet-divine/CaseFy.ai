import express from "express";
const router = express.Router();
import { register, login, logout, current, forgotPassword, resetPassword, googleAuth } from "../controllers/user.controller.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";

// Auth routes
router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/current", isAuthenticated, current);

export default router;