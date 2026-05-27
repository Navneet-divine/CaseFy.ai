import express from "express";
const router = express.Router();
import { register, login, logout, current, forgotPassword, resetPassword } from "../controllers/user.controller.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";

// Register route
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/current", isAuthenticated, current);

export default router;