import express from "express";
import * as authControl from "../controllers/auth.control.js";

const router = express.Router();

router.post("/register", authControl.register);
router.post("/login", authControl.login);
router.post("/refresh", authControl.refresh);

export default router;