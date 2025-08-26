import express from "express";
import {
  createAudit,
  getAudits,
  getAuditById,
  deleteAudit,
} from "../controllers/audit.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Auditor submits audit
router.post("/", verifyJWT, authorizeRoles("employee", "manager", "admin"), createAudit);

// Admin (or manager) can view all audits
router.get("/", verifyJWT, authorizeRoles("admin", "employee"), getAudits);

// Any logged-in user can view their own audit (extra logic can be added)
router.get("/:id", verifyJWT, getAuditById);
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteAudit);
router.put("/:id", verifyJWT, authorizeRoles("admin"));

export default router;
