import express from "express";
import AuthController from "../controllers/authController.js";
import { authenticateToken } from "../middlewares/auth.js";
import {
  loginValidation,
  registerValidation,
} from "../validations/authValidations.js";

const router = express.Router();

// Route d'inscription
router.post("/register", registerValidation, AuthController.register);

// Route de connexion
router.post("/login", loginValidation, AuthController.login);

// Route pour obtenir le profil (protégée)
router.get("/profile", authenticateToken, AuthController.getProfile);

// Route de renouvellement de token
router.post("/refresh", AuthController.refresh);

// Route de déconnexion
router.post("/logout", authenticateToken, AuthController.logout);

export default router;
