import express from "express";
import {
  createAudit,
  getAudits,
  getAuditById,
  deleteAudit,
  updateAudit,
} from "../controllers/audit.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { cache, cacheConfig } from "../middlewares/cache.middleware.js";
import { uploadFields } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get("/", verifyJWT, authorizeRoles("admin", "employee"), cache(cacheConfig.short), getAudits);
// Auditor submits audit (with photo upload support)
router.post("/", verifyJWT, authorizeRoles("employee", "manager", "admin"), uploadFields, createAudit);

// Admin (or manager) can view all audits

// Any logged-in user can view their own audit (extra logic can be added)
router.get("/:id", verifyJWT, cache(cacheConfig.medium), getAuditById);
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteAudit);
router.put("/:id", verifyJWT, authorizeRoles("admin"), updateAudit);

export default router;
