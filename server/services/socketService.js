import jwt from "jsonwebtoken";
import TaskController from "../controllers/taskController.js";
import User from "../models/User.js";

class SocketService {
  #io;
  #connectedUsers = new Map(); // Map pour stocker les utilisateurs connectés

  constructor(io) {
    this.#io = io;
    this.#setupSocketHandlers();
  }

  // Getter pour le nombre d'utilisateurs connectés
  get connectedUsersCount() {
    return this.#connectedUsers.size;
  }

  // Méthodes privées
  // Configuration initiale des handlers Socket.IO
  #setupSocketHandlers() {
    this.#setupAuthentication();
    this.#setupConnectionHandlers();
  }

  // Configuration du middleware d'authentification
  #setupAuthentication() {
    this.#io.use(async (socket, next) => {
      try {
        const token = socket.handshake.headers.authorization?.split(" ")[1];

        if (!token || token.length === 0) {
          return next(new Error("Token d'authentification requis"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
          return next(new Error("Utilisateur non trouvé"));
        }

        socket.user = user;
        next();
      } catch (error) {
        // Gestion spécifique des erreurs JWT
        if (error.name === "TokenExpiredError") {
          return next(new Error("jwt expired"));
        } else if (error.name === "JsonWebTokenError") {
          return next(new Error("invalid token"));
        } else {
          return next(new Error("Token invalide"));
        }
      }
    });
  }

  // Configuration des gestionnaires de connexion
  #setupConnectionHandlers() {
    this.#io.on("connection", (socket) => {
      this.#handleUserConnection(socket);
      this.#setupDisconnectionHandler(socket);
      this.#setupTaskEventHandlers(socket);
      this.#setupCRUDEventHandlers(socket);
    });
  }

  // Gestion de la connexion d'un utilisateur
  #handleUserConnection(socket) {
    // Stocker l'utilisateur connecté
    this.#connectedUsers.set(socket.user._id.toString(), {
      socketId: socket.id,
      user: socket.user,
    });

    // Rejoindre la room personnelle de l'utilisateur
    socket.join(`user_${socket.user._id}`);
  }

  // Configuration du handler de déconnexion
  #setupDisconnectionHandler(socket) {
    socket.on("disconnect", () => {
      this.#handleUserDisconnection(socket);
    });
  }

  // Gestion de la déconnexion d'un utilisateur
  #handleUserDisconnection(socket) {
    this.#connectedUsers.delete(socket.user._id.toString());
  }

  // Configuration des handlers d'événements de tâches
  #setupTaskEventHandlers(socket) {
    socket.on("task_updated", (data) => {
      this.#broadcastTaskUpdate(data);
    });
  }

  // Configuration des handlers d'événements CRUD
  #setupCRUDEventHandlers(socket) {
    // Création de tâche
    socket.on("create_task", async (taskData) => {
      await TaskController.createTaskViaSocket(socket, taskData);
    });

    // Mise à jour de tâche
    socket.on("update_task", async (taskData) => {
      await TaskController.updateTaskViaSocket(socket, taskData);
    });

    // Suppression de tâche
    socket.on("delete_task", async (taskData) => {
      await TaskController.deleteTaskViaSocket(socket, taskData);
    });
  }

  // Diffusion d'une mise à jour de tâche à tous les utilisateurs (pour mise à jour de la liste)
  #broadcastTaskUpdate(taskUpdate) {
    const { task, updatedBy } = taskUpdate;

    this.#connectedUsers.forEach((userData, userId) => {
      this.#sendTaskUpdateToUser(userData.socketId, task, updatedBy);
    });
  }

  // Envoi d'une mise à jour de tâche à un utilisateur spécifique
  #sendTaskUpdateToUser(socketId, task, updatedBy) {
    const eventData = {
      type: "task_update",
      data: {
        task,
        updatedBy: {
          id: updatedBy._id,
          username: updatedBy.username,
        },
      },
      timestamp: new Date(),
    };

    this.#io.to(socketId).emit("task_updated", eventData);
  }

  // Envoi d'une nouvelle tâche à un utilisateur spécifique
  #sendNewTaskToUser(socketId, task, createdBy) {
    const eventData = {
      type: "new_task",
      data: {
        task,
        createdBy: {
          id: createdBy._id,
          username: createdBy.username,
        },
      },
      timestamp: new Date(),
    };

    this.#io.to(socketId).emit("new_task", eventData);
  }

  // Envoi d'une notification à un utilisateur spécifique
  #sendNotificationToUser(socketId, notification) {
    const eventData = {
      type: "notification",
      data: notification,
      timestamp: new Date(),
    };
    this.#io.to(socketId).emit("notification", eventData);
  }

  // Méthodes publiques
  // Diffusion d'une nouvelle tâche seulement à l'utilisateur assigné
  notifyNewTaskToAssignedUser(task, createdBy) {
    const assignedUserId = task.assignedTo._id.toString();
    const userData = this.#connectedUsers.get(assignedUserId);

    if (userData) {
      this.#sendNewTaskToUser(userData.socketId, task, createdBy);
    }
  }

  // Diffusion d'une nouvelle tâche à tous les utilisateurs (pour mise à jour de la liste)
  broadcastNewTask(task, createdBy) {
    this.#connectedUsers.forEach((userData, userId) => {
      this.#sendNewTaskToUser(userData.socketId, task, createdBy);
    });
  }

  // Notifier la mise à jour d'une tâche seulement à l'utilisateur assigné
  notifyTaskUpdateToAssignedUser(task, updatedBy) {
    const assignedUserId = task.assignedTo._id.toString();
    const userData = this.#connectedUsers.get(assignedUserId);

    if (userData) {
      this.#sendTaskUpdateToUser(userData.socketId, task, updatedBy);
    }
  }

  // Notifier la suppression d'une tâche seulement à l'utilisateur assigné
  notifyTaskDeletedToAssignedUser(taskId, assignedUserId, deletedBy) {
    const userData = this.#connectedUsers.get(assignedUserId.toString());

    if (userData) {
      const eventData = {
        type: "task_deleted",
        data: {
          taskId: taskId,
          deletedBy: { _id: deletedBy._id, username: deletedBy.username },
        },
        timestamp: new Date(),
      };
      this.#io.to(userData.socketId).emit("task_deleted", eventData);
    }
  }

  // Envoi d'une notification à un utilisateur spécifique
  sendNotificationToUser(userId, notification) {
    const userData = this.#connectedUsers.get(userId.toString());
    if (userData) {
      this.#sendNotificationToUser(userData.socketId, notification);
    }
  }

  // Diffusion d'un événement à une room spécifique
  broadcastToRoom(roomName, eventName, data) {
    const eventData = {
      type: eventName,
      data: data,
      timestamp: new Date(),
    };
    this.#io.to(roomName).emit(eventName, eventData);
  }

  // Obtenir la liste des utilisateurs connectés
  getConnectedUsers() {
    return Array.from(this.#connectedUsers.values()).map((userData) => ({
      id: userData.user._id,
      username: userData.user.username,
      socketId: userData.socketId,
    }));
  }

  // Vérifier si un utilisateur est connecté
  isUserConnected(userId) {
    return this.#connectedUsers.has(userId.toString());
  }

  // Obtenir l'ID de socket d'un utilisateur
  getUserSocketId(userId) {
    const userData = this.#connectedUsers.get(userId.toString());
    return userData ? userData.socketId : null;
  }
}

export default SocketService;
