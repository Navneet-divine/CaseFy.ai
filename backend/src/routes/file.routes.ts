import express from "express";
const app = express.Router();
import { upload } from "../utils/multer.js";

import { isAuthenticated } from "../middleware/auth.middleware.js";
import { uploadFile } from "../controllers/file.controller.js";

app.post("/upload-file", isAuthenticated, upload.array("file"), uploadFile);

export default app;
