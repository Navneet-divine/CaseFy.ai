import prisma from "../lib/prisma.js";
import { Request, Response } from "express";
import { comparePassword, hashPassword } from "../utils/bcrypt.js";
import { signToken, verifyToken } from "../utils/jwt.js";
import { Resend } from 'resend';
import forgotPasswordTemplate from "../templates/forgotPasswordTemplate.js";
import crypto from 'crypto';

const resetToken = crypto.randomBytes(32).toString('hex');

const resetPasswordExpires =
  new Date(Date.now() + 1000 * 60 * 15);


const isProduction = process.env.NODE_ENV === "production";
const resend = new Resend(process.env.RESEND_API_KEY);
const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

export const register = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const userData = {
      fullName,
      email,
      password: await hashPassword(password),
    };

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const newUser = await prisma.user.create({
      data: userData,
    });
    console.log('New user created:', newUser);

    const token = signToken(newUser);


    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({ message: "Registration successful", user: newUser, });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isValidUser = await comparePassword(password, user?.password || "");

    if (!isValidUser) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({ message: "Login successful", user, });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // Clear the token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    });
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires,
      },
    });


    // TODO: Implement password reset logic (e.g., send reset email)
    resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Reset Your Password 🔐',

      html: forgotPasswordTemplate(resetLink),
    });

    res.status(200).json({ message: "If that email exists, we'll send instructions." });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export const resetPassword = async (
  req: Request,
  res: Response
) => {
  try {

    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Password is required',
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: Array.isArray(token) ? token[0] : token,

        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired token',
      });
    }

    const hashedPassword =
      await hashPassword(password)

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        password: hashedPassword,

        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    res.status(200).json({
      message: 'Password reset successful',
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: 'Internal Server Error',
    });
  }
};

export const current = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const payload = verifyToken(token);

    if (!payload || !payload.userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

