import express from "express";
import {
  createLine,
  getLines,
  deleteLine,
} from "../controllers/line.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyJWT, authorizeRoles("admin"), createLine);
router.get("/", verifyJWT, getLines);
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteLine);

export default router;
