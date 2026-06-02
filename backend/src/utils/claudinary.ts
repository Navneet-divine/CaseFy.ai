import cloudinary from "../lib/claudinary";
import { UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

export const uploadToCloudinary = (
  buffer: Buffer
): Promise<UploadApiResponse> => {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "case-files/pdfs",
        resource_type: "raw",
      },
      (
        error: UploadApiErrorResponse | undefined,
        result: UploadApiResponse | undefined
      ) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary upload failed"));
          return;
        }

        resolve(result);
      }
    );

    stream.end(buffer);
  });
};