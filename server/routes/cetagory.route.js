import express from "express";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";

const router = express.Router();

// CATEGORY ROUTES
router.post("/", verifyJWT, authorizeRoles("admin"), createCategory);
router.get("/", verifyJWT, getCategories);
router.get("/:id", verifyJWT, getCategoryById);
router.put("/:id", verifyJWT, authorizeRoles("admin"), updateCategory);
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteCategory);

export default router;
