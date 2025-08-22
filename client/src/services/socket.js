import axios from "axios";
import { io } from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  // Fonction simple pour refresh le token
  async refreshToken() {
    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_URL || "http://localhost:3001/api";
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,
        }
      );

      if (response.data.success && response.data.accessToken) {
        localStorage.setItem("accessToken", response.data.accessToken);
        return response.data.accessToken;
      }
      throw new Error("Refresh échoué");
    } catch (error) {
      localStorage.removeItem("accessToken");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      throw error;
    }
  }

  // Se connecter au serveur Socket.IO
  async connect() {
    // Éviter les connexions multiples
    if (this.socket && this.isConnected) {
      return;
    }

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken || accessToken === "undefined" || accessToken === "null") {
      return;
    }

    this.socket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:3001",
      {
        extraHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      }
    );

    // Gestion des événements de connexion
    this.socket.on("connect", () => {
      this.isConnected = true;
      // Émettre un événement personnalisé pour notifier les composants
      window.dispatchEvent(new CustomEvent("socketConnected"));
    });

    this.socket.on("disconnect", () => {
      this.isConnected = false;
      // Émettre un événement personnalisé pour notifier les composants
      window.dispatchEvent(new CustomEvent("socketDisconnected"));
    });

    this.socket.on("connect_error", async (error) => {
      this.isConnected = false;

      // Si erreur d'authentification, essayer de refresh
      if (
        error.message === "jwt expired" ||
        error.message === "invalid token" ||
        error.message === "Token d'authentification requis"
      ) {
        try {
          await this.refreshToken();
          // Reconnecter avec le nouveau token
          this.disconnect();
          await this.connect();
        } catch {
          // Refresh échoué
        }
      }
    });

    this.socket.on("reconnect", () => {
      this.isConnected = true;

      // Mettre à jour le token dans les headers après reconnexion
      const newToken = localStorage.getItem("accessToken");
      if (newToken) {
        this.socket.auth = { token: newToken };
      }
    });

    this.socket.on("reconnect_attempt", () => {
      // Mettre à jour le token pour la nouvelle tentative
      const newToken = localStorage.getItem("accessToken");
      if (newToken) {
        this.socket.auth = { token: newToken };
      }
    });
  }

  // Se déconnecter du serveur Socket.IO
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
  }

  // Méthodes CRUD
  createTask(taskData) {
    if (this.socket && this.isConnected) {
      this.socket.emit("create_task", taskData);
    }
  }

  updateTask(taskId, taskData) {
    if (this.socket && this.isConnected) {
      const payload = { taskId, ...taskData };
      this.socket.emit("update_task", payload);
    } else {
      console.log("Socket non connecté, impossible d'émettre");
    }
  }

  deleteTask(taskId) {
    if (this.socket && this.isConnected) {
      this.socket.emit("delete_task", { taskId });
    }
  }

  // Getter pour accéder directement à l'instance socket
  get socketInstance() {
    return this.socket;
  }

  // Vérifier si on est connecté
  isSocketConnected() {
    return this.isConnected;
  }
}

// Instance unique partagée
const socketService = new SocketService();

export default socketService;
