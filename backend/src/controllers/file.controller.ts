import prisma from "../lib/prisma";
import { Request, Response } from "express";
import { verifyToken } from "../utils/jwt";


export const uploadFile = async (req: Request, res: Response) => {
    try {
        const { fileName, caseId } = req.body;
        console.log("Request body:", req.body);

        // Uploaded file from multer
        const uploadedFiles = req.files as Express.Multer.File[];

        console.log("Uploaded files:", uploadedFiles);

        if (!uploadedFiles || uploadedFiles.length === 0) {
            return res.status(400).json({
                error: "File is required",
            });
        }

        // Count existing files
        const existingFiles = await prisma.file.count({
            where: {
                caseId,
            },
        });

        if (existingFiles >= 10) {
            return res.status(400).json({
                error: "Maximum 10 files allowed",
            });
        }



        // Generate version
        const createdFiles = [];

        // Save in DB
        for (let i = 0; i < uploadedFiles.length; i++) {
            const uploadedFile = uploadedFiles[i];

            const fileVersion = `v${existingFiles + i + 1}`;

            const file = await prisma.file.create({
                data: {
                    fileName,
                    caseId,
                    fileVersion,
                    url: uploadedFile.path,
                },
            });

            createdFiles.push(file);
        }
        res.status(201).json({
            success: true,
            files: createdFiles,
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            error: "Failed to upload file",
        });
    }
};