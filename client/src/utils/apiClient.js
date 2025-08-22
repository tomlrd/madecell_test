import axios from "axios";
import socketService from "../services/socket";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Instance axios simple
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Ajouter le token dans les headers
api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken && accessToken !== "undefined" && accessToken !== "null") {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Intercepteur de réponse pour gérer automatiquement les erreurs 401 (token expiré)
api.interceptors.response.use(
  // Si la réponse est réussie, on la retourne directement
  (response) => response,

  // Si une erreur se produit, on la traite
  async (error) => {
    // Vérifier si c'est une erreur 401 (non autorisé) ET qu'on n'a pas déjà retenté
    if (error.response?.status === 401 && !error.config._retry) {
      // Marquer cette requête comme déjà retentée pour éviter les boucles infinies
      error.config._retry = true;

      try {
        // Tenter de rafraîchir le token d'accès
        await socketService.refreshToken();

        // Récupérer le nouveau token depuis le localStorage
        const newToken = localStorage.getItem("accessToken");

        // Mettre à jour l'en-tête Authorization avec le nouveau token
        error.config.headers.Authorization = `Bearer ${newToken}`;

        // Refaire la requête originale avec le nouveau token
        return api(error.config);
      } catch {
        // Si le refresh échoue, on rejette l'erreur originale
        // Cela déclenchera une redirection vers la page de login
        return Promise.reject(error);
      }
    }

    // Pour toutes les autres erreurs (non-401), on les rejette directement
    return Promise.reject(error);
  }
);

export default api;
