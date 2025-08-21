import { create } from "zustand";
import socketService from "../services/socket";
import api from "../utils/apiClient";

const useAuthStore = create((set) => ({
  // État
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  // Actions
  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post("/auth/login", credentials);

      // Stocker le token d'accès
      if (response.data.data.token) {
        localStorage.setItem("accessToken", response.data.data.token);
      }

      set({
        user: response.data.data.user,
        isAuthenticated: true,
        loading: false,
        error: null,
      });

      // Connecter Socket.IO après login réussi
      await socketService.connect();

      return response;
    } catch (error) {
      // Gérer les erreurs de validation du backend
      let errorMessage = "Erreur de connexion";

      if (error.response?.data?.errors) {
        // Erreurs de validation Express-validator
        const validationErrors = error.response.data.errors;
        errorMessage = validationErrors.map((err) => err.msg).join(", ");
      } else if (error.response?.data?.message) {
        // Message d'erreur du backend
        errorMessage = error.response.data.message;
      }

      set({
        error: errorMessage,
        loading: false,
        user: null,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post("/auth/register", userData);

      // Stocker le token d'accès
      if (response.data.data.token) {
        localStorage.setItem("accessToken", response.data.data.token);
      }

      set({
        user: response.data.data.user,
        isAuthenticated: true,
        loading: false,
        error: null,
      });

      // Connecter Socket.IO après inscription réussi
      await socketService.connect();

      return response;
    } catch (error) {
      // Gérer les erreurs de validation du backend
      let errorMessage = "Erreur d'inscription";

      if (error.response?.data?.errors) {
        // Erreurs de validation Express-validator
        const validationErrors = error.response.data.errors;
        errorMessage = validationErrors.map((err) => err.msg).join(", ");
      } else if (error.response?.data?.message) {
        // Message d'erreur du backend
        errorMessage = error.response.data.message;
      }

      set({
        error: errorMessage,
        loading: false,
        user: null,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignorer les erreurs de déconnexion
    } finally {
      // Déconnecter Socket.IO
      socketService.disconnect();

      // Supprimer le token d'accès
      localStorage.removeItem("accessToken");

      set({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      });
    }
  },

  getCurrentUser: async () => {
    set({ loading: true });
    try {
      const response = await api.get("/auth/profile");
      const user = response.data.data.user;
      if (user) {
        set({
          user,
          isAuthenticated: true,
          loading: false,
          error: null,
        });

        // Connecter Socket.IO si pas déjà connecté
        if (!socketService.isSocketConnected()) {
          await socketService.connect();
        }

        return user;
      } else {
        set({
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null,
        });
        return null;
      }
    } catch (error) {
      // Si erreur 401, c'est normal (pas de token ou token expiré)
      if (error.response?.status === 401) {
        localStorage.removeItem("accessToken");
      }

      set({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null, // Ne pas stocker l'erreur 401 comme erreur
      });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
