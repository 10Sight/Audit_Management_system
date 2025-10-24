import express from 'express';
import { 
  getDepartments, 
  getSingleDepartment, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment,
  assignEmployeeToDepartment,
  getDepartmentStats
} from "../controllers/department.controller.js";
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Get all active departments for login (public access)
router.get("/public", getDepartments);

// Get all departments (accessible to all authenticated users)
router.get("/", verifyJWT, getDepartments);

// Get department statistics (admin only)
router.get("/stats", verifyJWT, authorizeRoles("admin"), getDepartmentStats);

// Get single department (accessible to all authenticated users)
router.get("/:id", verifyJWT, getSingleDepartment);

// Create department (admin only)
router.post("/", verifyJWT, authorizeRoles("admin"), createDepartment);

// Update department (admin only)
router.put("/:id", verifyJWT, authorizeRoles("admin"), updateDepartment);

// Delete department (admin only)
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteDepartment);

// Assign employee to department (admin only)
router.post("/assign-employee", verifyJWT, authorizeRoles("admin", "superadmin"), assignEmployeeToDepartment);

export default router;
