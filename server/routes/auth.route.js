import express from 'express';
import { registerEmployee, loginEmployee, logoutEmployee, getEmployees, deleteEmployee, getSingleEmployee, getCurrentUser, updateEmployee, getAllUsers, populateUsernames } from "../controllers/auth.controller.js";
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { loginLimiter } from '../middlewares/rateLimiters.middleware.js';
import { validate } from '../middlewares/validte.middleware.js';
import { registerSchema, loginSchema, paginationSchema, updateSchema, idParamSchema } from '../validators/auth.validators.js';

const router  = express.Router();

router.post("/register", verifyJWT, authorizeRoles("admin"), registerEmployee);
router.post("/login", loginLimiter, validate(loginSchema), loginEmployee);
router.post("/logout", verifyJWT, logoutEmployee);
router.get("/get-employee", verifyJWT, authorizeRoles("admin"), getEmployees);
router.get("/get-all-users", verifyJWT, authorizeRoles("admin"), getAllUsers);
router.delete("/employee/:id", verifyJWT, authorizeRoles("admin"), deleteEmployee);
router.put("/employee/:id", verifyJWT, authorizeRoles("admin"), updateEmployee);
router.get("/employee/:id", verifyJWT, getSingleEmployee);
router.get("/me", verifyJWT, getCurrentUser);
// Migration route - can be removed after running once
router.post("/migrate-usernames", populateUsernames);

export default router;
