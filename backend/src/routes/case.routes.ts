import express from "express";
const app = express.Router();

import { isAuthenticated } from "../middleware/auth.middleware.js";
import { createCase, deleteCase, getCaseById, getCases, updateCase } from "../controllers/case.controller";



app.get("/get-cases", isAuthenticated, getCases);
app.get("/get-case/:id", isAuthenticated, getCaseById);
app.post("/create-case", isAuthenticated, createCase);
app.put("/update-case/:id", isAuthenticated, updateCase);
app.delete("/delete-case/:id", isAuthenticated, deleteCase);

export default app;
