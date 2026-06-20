import prisma from "../lib/prisma.js";
import { Request, Response } from "express";
import { uploadToCloudinary } from "../utils/claudinary.js";
import cloudinary from "../lib/claudinary.js";
import { PDFParse } from "pdf-parse";

export const uploadFile = async (req: Request, res: Response) => {
  try {
    const action = req.query.action as string;

    const uploadedFiles = req.files as Express.Multer.File[];

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({
        error: "File is required",
      });
    }

    // Only extract text
    if (action === "extract") {
      const extractedFiles = [];

      for (const uploadedFile of uploadedFiles) {
        const parser = new PDFParse(
          new Uint8Array(uploadedFile.buffer)
        );

        const pdfData = await parser.getText();

        extractedFiles.push({
          filename: uploadedFile.originalname,
          text: pdfData.text,
        });

        await parser.destroy();
      }

      return res.status(200).json({
        success: true,
        files: extractedFiles,
      });
    }

    // Upload + save
    const { fileName, caseId } = req.body;

    const existingFiles = await prisma.file.count({
      where: { caseId },
    });

    const createdFiles = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const uploadedFile = uploadedFiles[i];

      const parser = new PDFParse(
        new Uint8Array(uploadedFile.buffer)
      );

      const pdfData = await parser.getText();

      await parser.destroy();

      const result = await uploadToCloudinary(
        uploadedFile.buffer
      );

      const fileVersion = `v${existingFiles + i + 1}`;

      const file = await prisma.file.create({
        data: {
          fileName,
          caseId,
          fileVersion,
          url: result.secure_url,
          cloudinaryPublicId: result.public_id,
          size: uploadedFile.size,

          // save extracted text
          extractedText: pdfData.text,
        },
      });

      createdFiles.push(file);
    }

    return res.status(201).json({
      success: true,
      files: createdFiles,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to process files",
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

    res
      .status(200)
      .json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
};

// export const extractText = async (req: Request, res: Response) => {
//   try {
//     const files = req.files as Express.Multer.File[];

//     if (!files || files.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "No file uploaded",
//       });
//     }

//     const extractedFiles = [];

//     for (const file of files) {
//       const uint8Array = new Uint8Array(file.buffer);

//       const parser = new PDFParse(uint8Array);
//       const pdfData = await parser.getText();

//       extractedFiles.push({
//         filename: file.originalname,
//         text: pdfData.text,
//       });

//       await parser.destroy();
//     }

//     return res.status(200).json({
//       success: true,
//       files: extractedFiles,
//     });
//   } catch (error) {
//     console.error("Error extracting text:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to extract text",
//     });
//   }
// };
