import express from "express";
import {
  createQuestion,
  getQuestions,
  deleteQuestion,
} from "../controllers/question.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Admin creates/deletes, auditors just fetch
router.post("/", verifyJWT, authorizeRoles("admin"), createQuestion);
router.get("/", verifyJWT, getQuestions);
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteQuestion);

export default router;
