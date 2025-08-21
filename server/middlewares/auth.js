import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { handleAuthError } from "../utils/errorHandler.js";

// Middleware pour vérifier le token JWT
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token d'accès requis",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Vérifier que l'utilisateur existe toujours
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return handleAuthError(error, res);
  }
};
