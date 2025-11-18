import express from "express";
import {
  createUnit,
  getUnits,
  updateUnit,
  deleteUnit,
  reorderUnits,
} from "../controllers/unit.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyJWT, authorizeRoles("admin"), createUnit);
router.get("/", verifyJWT, getUnits);
router.put("/:id", verifyJWT, authorizeRoles("admin"), updateUnit);
router.post("/reorder", verifyJWT, authorizeRoles("admin"), reorderUnits);
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteUnit);

export default router;
