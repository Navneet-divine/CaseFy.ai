import express from "express";
const app = express.Router();
import { upload } from "../utils/multer.js";

import { isAuthenticated } from "../middleware/auth.middleware.js";
import { uploadFile } from "../controllers/file.controller.js";


app.post("/upload-file", upload.array("file"), isAuthenticated, uploadFile);


export default app;
