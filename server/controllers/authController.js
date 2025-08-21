import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { handleServerError } from "../utils/errorHandler.js";

class AuthController {
  // Méthodes privées
  static #generateAccessToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
  }

  static #generateRefreshToken(userId) {
    return jwt.sign(
      { userId, type: "refresh" },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
      }
    );
  }

  static #handleValidationErrors(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return {
        hasErrors: true,
        response: res.status(400).json({
          success: false,
          message: "Données invalides",
          errors: errors.array(),
        }),
      };
    }
    return { hasErrors: false };
  }

  static async #comparePassword(user, pass) {
    const result = await bcrypt.compare(pass, user.password);
    return result;
  }

  // Méthodes publiques
  static async register(req, res) {
    try {
      // Validation
      const validation = AuthController.#handleValidationErrors(req, res);
      if (validation.hasErrors) return;

      const { username, email, password } = req.body;

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message:
            "Un utilisateur avec cet email ou nom d'utilisateur existe déjà",
        });
      }

      // Créer le nouvel utilisateur
      const user = new User({
        username,
        email,
        password,
      });

      await user.save();

      // Générer les tokens et répondre
      const accessToken = AuthController.#generateAccessToken(user._id);
      const refreshToken = AuthController.#generateRefreshToken(user._id);
      const response = {
        success: true,
        data: {
          user: {
            _id: user._id,
            username: user.username,
            email: user.email,
          },
          token: accessToken,
        },
      };

      // Refresh token dans un cookie sécurisé (AVANT res.json)
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      });

      // Access token dans le body (APRÈS res.cookie)
      res.status(201).json({
        ...response,
        message: "Utilisateur créé avec succès",
      });
    } catch (error) {
      handleServerError(error, res, "l'inscription");
    }
  }

  static async login(req, res) {
    try {
      // Validation
      const validation = AuthController.#handleValidationErrors(req, res);
      if (validation.hasErrors) return;

      const { email, password } = req.body;

      // Trouver l'utilisateur par email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Email ou mot de passe incorrect",
        });
      }

      // Vérifier le mot de passe
      const isPasswordValid = await AuthController.#comparePassword(
        user,
        password
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Email ou mot de passe incorrect",
        });
      }

      // Générer les tokens et répondre
      const accessToken = AuthController.#generateAccessToken(user._id);
      const refreshToken = AuthController.#generateRefreshToken(user._id);
      const response = {
        success: true,
        data: {
          user: {
            _id: user._id,
            username: user.username,
            email: user.email,
          },
          token: accessToken,
        },
      };

      // Refresh token dans un cookie sécurisé (AVANT res.json)
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true, // Pas accessible via JavaScript
        secure: process.env.NODE_ENV === "production", // HTTPS seulement en production
        sameSite: "strict", // Protection CSRF
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      });

      // Access token dans le body (APRÈS res.cookie)
      res.json({
        ...response,
        message: "Connexion réussie",
      });
    } catch (error) {
      handleServerError(error, res, "la connexion");
    }
  }

  static async getProfile(req, res) {
    try {
      res.json({
        success: true,
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      handleServerError(error, res, "la récupération du profil");
    }
  }

  static async refresh(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: "Refresh token manquant",
        });
      }

      // Vérifier le refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Vérifier que c'est bien un refresh token
      if (decoded.type !== "refresh") {
        return res.status(401).json({
          success: false,
          message: "Token invalide",
        });
      }

      // Vérifier que l'utilisateur existe toujours
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Utilisateur non trouvé",
        });
      }

      // Générer un nouveau access token
      const newAccessToken = AuthController.#generateAccessToken(user._id);

      res.json({
        success: true,
        accessToken: newAccessToken,
      });
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Refresh token invalide",
        });
      }
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Refresh token expiré",
        });
      }
      handleServerError(error, res, "le renouvellement du token");
    }
  }

  static async logout(req, res) {
    try {
      // Supprimer le refresh token du cookie
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      res.json({
        success: true,
        message: "Déconnexion réussie",
      });
    } catch (error) {
      handleServerError(error, res, "la déconnexion");
    }
  }
}

export default AuthController;
