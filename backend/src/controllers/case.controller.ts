import prisma from "../lib/prisma.js";
import { Request, Response } from "express";
import { verifyToken } from "../utils/jwt.js";


export const getCases = async (req: Request, res: Response) => {
    try {
        const limit = Number(req.query.limit) || undefined;

        const cases = await prisma.case.findMany({
            take: limit,
            orderBy: {
                createdAt: "desc",
            },

        });

        const totalCases = await prisma.case.count();

        res.status(200).json({ cases, totalCases });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch cases" });
    }
};

export const getCaseById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const caseItem = await prisma.case.findUnique({ where: { id } });

        if (!caseItem) {
            return res.status(404).json({ error: "Case not found" });
        }

        res.status(200).json(caseItem);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch case" });
    }
}

export const createCase = async (req: Request, res: Response) => {
    try {
        const token = req.cookies.token;
        const userId = verifyToken(token)?.userId;
        const { title, description, status } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } },);

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }

        if (!description) {
            return res.status(400).json({ error: "Description is required" });
        }

        const newCase = await prisma.case.create({
            data: {
                title,
                description,
                status: status || "open",
                userId,
            },
        });

        console.log("Created new case:", newCase);
        res.status(201).json(newCase);
    } catch (error) {
        console.error("PRISMA ERROR:", error);
        return res.status(500).json({
            error: "Failed to create case",
        });
    }
};

export const updateCase = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { title, description, status, files } = req.body;

        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }

        if (!description) {
            return res.status(400).json({ error: "Description is required" });
        }

        if (status && !["open", "closed"].includes(status)) {
            return res.status(400).json({ error: "Invalid status value" });
        }

        const updatedCase = await prisma.case.update({
            where: { id },
            data: {
                title,
                description,
                status: status || "open",
                files,
            },
        });
        res.status(200).json(updatedCase);
    } catch (error) {
        res.status(500).json({ error: "Failed to update case" });
    }
}

export const deleteCase = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const deletedCase = await prisma.case.delete({ where: { id } });

        if (!deletedCase) {
            return res.status(404).json({ error: "Case not found" });
        }

        res.status(204).json(deletedCase);
    } catch (error) {
        res.status(500).json({ error: "Failed to delete case" });
    }
}