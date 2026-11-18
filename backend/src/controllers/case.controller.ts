import prisma from "../lib/prisma.js";
import { Request, Response } from "express";
import { verifyToken } from "../utils/jwt.js";
import { GoogleGenAI } from "@google/genai";
import { chunkText, getEmbedding, getEmbeddings, cosineSimilarity } from "../utils/embeddings.js";


export const getCases = async (req: Request, res: Response) => {
    try {
        const limit = Number(req.query.limit) || undefined;

        const cases = await prisma.case.findMany({
            take: limit,
            orderBy: {
                createdAt: "desc",
            },
            include: {
                files: true,
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
        const caseItem = await prisma.case.findUnique({
            where: { id },
            include: {
                files: true,
            },
        });

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


export const chatWithCase = async (req: Request, res: Response) => {
    try {
        const { id: caseId } = req.params as { id: string };
        const { query, fileIds } = req.body;

        if (!query?.trim()) {
            return res.status(400).json({
                error: "Query is required",
            });
        }

        // -----------------------------
        // Get files to search
        // -----------------------------

        let selectedFileIds: string[] = [];

        if (Array.isArray(fileIds) && fileIds.length > 0) {
            selectedFileIds = fileIds;
        } else {
            const files = await prisma.file.findMany({
                where: {
                    caseId,
                },
                select: {
                    id: true,
                },
            });

            selectedFileIds = files.map((file) => file.id);
        }

        if (selectedFileIds.length === 0) {
            return res.status(404).json({
                error: "No files found in this case.",
            });
        }

        // -----------------------------
        // Generate embedding
        // -----------------------------

        const queryEmbedding = await getEmbedding(query);

        // -----------------------------
        // Vector Search
        // -----------------------------

        const result: any = await prisma.$runCommandRaw({
            aggregate: "filechunk", // <-- change if your collection name differs

            pipeline: [
                {
                    $vectorSearch: {
                        index: "file_chunk_vector_index",

                        path: "embedding",

                        queryVector: queryEmbedding,

                        limit: 5,

                        numCandidates: 100,

                        filter: {
                            fileId: {
                                $in: selectedFileIds,
                            },
                        },
                    },
                },

                {
                    $lookup: {
                        from: "file", // <-- change if needed

                        localField: "fileId",

                        foreignField: "_id",

                        as: "file",
                    },
                },

                {
                    $unwind: "$file",
                },

                {
                    $project: {
                        _id: 0,

                        text: 1,

                        similarity: {
                            $meta: "vectorSearchScore",
                        },

                        fileName: "$file.fileName",
                    },
                },
            ],

            cursor: {},
        });

        const chunks = result.cursor.firstBatch;

        if (!chunks.length) {
            return res.status(200).json({
                success: true,
                answer: "No relevant information was found.",
                sources: [],
            });
        }

        // -----------------------------
        // Build context
        // -----------------------------

        const context = chunks
            .map(
                (chunk: any, index: number) =>
                    `Excerpt ${index + 1}
File: ${chunk.fileName}

${chunk.text}`
            )
            .join("\n\n");

        // -----------------------------
        // Ask Gemini
        // -----------------------------

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                error: "GEMINI_API_KEY is not defined in backend environment variables. Please check backend/.env file."
            });
        }

        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
You are an AI legal assistant.

Answer ONLY using the provided context.

If the answer is not present,
say:

"I couldn't find that information in the selected files."

Context:

${context}

Question:

${query}
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return res.json({
            success: true,

            answer: response.text || "No response generated.",

            sources: chunks.map((chunk: any) => ({
                fileName: chunk.fileName,
                similarity: chunk.similarity,
            })),
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Something went wrong.",
        });
    }
};