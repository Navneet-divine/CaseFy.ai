import express from "express";
const app = express.Router();
import { upload } from "../utils/multer.js";

import { isAuthenticated } from "../middleware/auth.middleware.js";
import { uploadFile, deleteFile, } from "../controllers/file.controller.js";

app.post("/upload-file", isAuthenticated, upload.array("files",10), uploadFile);
app.delete("/delete-file/:id", isAuthenticated, deleteFile);


export default app;
