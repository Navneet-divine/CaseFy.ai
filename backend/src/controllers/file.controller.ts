import prisma from "../lib/prisma.js";
import { Request, Response } from "express";
import { uploadToCloudinary } from "../utils/claudinary.js";
import cloudinary from "../lib/claudinary.js";

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

    if (existingFiles + uploadedFiles.length > 10) {
      return res.status(400).json({
        error: `Only ${10 - existingFiles} file(s) can be uploaded`,
      });
    }

    // Generate version
    const createdFiles = [];

    // Save in DB
    for (let i = 0; i < uploadedFiles.length; i++) {
      const uploadedFile = uploadedFiles[i];

      const result = await uploadToCloudinary(uploadedFile.buffer);

      const fileVersion = `v${existingFiles + i + 1}`;

      const file = await prisma.file.create({
        data: {
          fileName,
          caseId,
          fileVersion,
          url: result.secure_url,
          cloudinaryPublicId: result.public_id,
          size: uploadedFile.size,
        },
      });

      createdFiles.push(file);
    }
    res.status(201).json({
      success: true,
      message: "File(s) uploaded successfully",
      files: createdFiles,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: "Failed to upload file",
    });
  }
};

export const deleteFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const file = await prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
          resource_type: "raw",
        });
      } catch (cloudinaryErr) {
        console.error("Failed to delete from Cloudinary:", cloudinaryErr);
      }
    }

    await prisma.file.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
};
