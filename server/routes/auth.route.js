import express from 'express';
import { registerEmployee, loginEmployee, logoutEmployee, getEmployees, deleteEmployee, getSingleEmployee, getCurrentUser } from "../controllers/auth.controller.js";
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router  = express.Router();

router.post("/register", registerEmployee);
router.post("/login", loginEmployee);
router.post("/logout", verifyJWT, logoutEmployee);
router.get("/get-employee", verifyJWT, authorizeRoles("admin"), getEmployees);
router.delete("/employee/:id", verifyJWT, authorizeRoles("admin"), deleteEmployee);
router.get("/employee/:id", verifyJWT, authorizeRoles("admin"), getSingleEmployee);
router.get("/me", verifyJWT, getCurrentUser);

export default router;