import express from "express";
import {
  createMachine,
  getMachines,
  deleteMachine,
} from "../controllers/machine.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Only admin can create/delete machines
router.post("/", verifyJWT, authorizeRoles("admin"), createMachine);
router.get("/", verifyJWT, getMachines);
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteMachine);

export default router;
