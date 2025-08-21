// Utilitaire centralisé pour la gestion d'erreur
export const handleServerError = (error, res, operation = "l'opération") => {
  return res.status(500).json({
    success: false,
    message: "Erreur interne du serveur",
  });
};

export const handleAuthError = (error, res) => {
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Token invalide",
    });
  }
  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expiré",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Erreur interne du serveur",
  });
};
