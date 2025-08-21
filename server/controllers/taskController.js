import { validationResult } from "express-validator";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { handleServerError } from "../utils/errorHandler.js";

class TaskController {
  // Méthodes privées
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

  static async #populateTaskReferences(taskId) {
    return await Task.findById(taskId)
      .populate("assignedTo", "username email")
      .populate("createdBy", "username email");
  }

  static async #findByUser(userId, userRole) {
    // Tout le monde voit toutes les tâches
    return Task.find({})
      .populate("assignedTo", "username email")
      .populate("createdBy", "username email")
      .sort({ updatedAt: -1 });
  }

  // Méthodes publiques
  static async createTask(req, res) {
    try {
      const validation = TaskController.#handleValidationErrors(req, res);
      if (validation.hasErrors) return;

      const { title, description, assignedTo, priority, dueDate, tags } =
        req.body;

      // Vérifier que l'utilisateur assigné existe
      const assignedUser = await User.findById(assignedTo);
      if (!assignedUser) {
        return res.status(400).json({
          success: false,
          message: "Utilisateur assigné non trouvé",
        });
      }

      // Vérifier les permissions
      const isAdmin = req.user.role === "admin";
      if (!isAdmin && assignedTo !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Vous ne pouvez créer une tâche que pour vous-même",
        });
      }

      // Créer la tâche
      const task = new Task({
        title,
        description,
        assignedTo,
        priority,
        dueDate,
        tags: tags || [],
        createdBy: req.user._id,
      });

      await task.save();

      const populatedTask = await TaskController.#populateTaskReferences(
        task._id
      );

      // Socket.IO notification - diffuser à tous les utilisateurs
      if (req.app.get("socketService")) {
        const socketService = req.app.get("socketService");
        socketService.broadcastNewTask(populatedTask, {
          _id: req.user._id,
          username: req.user.username,
        });
      }

      res.status(201).json({
        success: true,
        message: "Tâche créée avec succès",
        data: { task: populatedTask },
      });
    } catch (error) {
      handleServerError(error, res, "la création de la tâche");
    }
  }

  // Méthode pour créer une tâche via Socket.IO
  static async createTaskViaSocket(socket, taskData) {
    try {
      const { title, description, assignedTo, priority, dueDate, tags } =
        taskData;

      // Vérifier que l'utilisateur assigné existe
      const assignedUser = await User.findById(assignedTo);
      if (!assignedUser) {
        socket.emit("task_error", {
          data: { message: "Utilisateur assigné non trouvé" },
        });
        return;
      }

      // Vérifier les permissions
      const isAdmin = socket.user.role === "admin";
      if (!isAdmin && assignedTo !== socket.user._id.toString()) {
        socket.emit("task_error", {
          data: {
            message: "Vous ne pouvez créer une tâche que pour vous-même",
          },
        });
        return;
      }

      // Créer la tâche
      const task = new Task({
        title,
        description,
        assignedTo,
        priority,
        dueDate,
        tags: tags || [],
        createdBy: socket.user._id,
      });

      await task.save();

      const populatedTask = await TaskController.#populateTaskReferences(
        task._id
      );

      // Confirmer la création à l'émetteur
      socket.emit("task_created", { data: { task: populatedTask } });

      // Diffuser la nouvelle tâche à tous les utilisateurs (pour mise à jour de la liste)
      socket.broadcast.emit("new_task", {
        data: {
          task: populatedTask,
          createdBy: { _id: socket.user._id, username: socket.user.username },
        },
      });

      // Notification toast à l'utilisateur assigné
      socket
        .to(`user_${populatedTask.assignedTo._id}`)
        .emit("task_notification", {
          data: {
            type: "task_created",
            task: populatedTask,
            createdBy: {
              _id: socket.user._id,
              username: socket.user.username,
            },
          },
        });

      // Notification toast à l'émetteur (pour feedback immédiat)
      socket.emit("task_notification", {
        data: {
          type: "task_created",
          task: populatedTask,
          createdBy: {
            _id: socket.user._id,
            username: socket.user.username,
          },
        },
      });
    } catch (error) {
      socket.emit("task_error", {
        data: { message: "Erreur lors de la création de la tâche" },
      });
    }
  }

  // Méthode pour mettre à jour une tâche via Socket.IO
  static async updateTaskViaSocket(socket, taskData) {
    try {
      const { taskId, ...updateData } = taskData;

      console.log("🔍 DEBUG updateTaskViaSocket:");
      console.log("📦 taskData reçu:", taskData);
      console.log(
        "👤 Utilisateur:",
        socket.user.username,
        "Role:",
        socket.user.role
      );

      const task = await Task.findById(taskId);
      if (!task) {
        console.log("❌ Tâche non trouvée");
        socket.emit("task_error", { data: { message: "Tâche non trouvée" } });
        return;
      }

      console.log("📋 Tâche trouvée:", {
        id: task._id,
        createdBy: task.createdBy,
        assignedTo: task.assignedTo,
        title: task.title,
      });

      // Vérifier les permissions
      const isAdmin = socket.user.role === "admin";
      const isCreator =
        task.createdBy.toString() === socket.user._id.toString();
      const isAssigned =
        task.assignedTo.toString() === socket.user._id.toString();

      console.log("🔐 Permissions:", {
        isAdmin,
        isCreator,
        isAssigned,
        userRole: socket.user.role,
        userId: socket.user._id,
        taskCreatedBy: task.createdBy,
        taskAssignedTo: task.assignedTo,
      });

      if (!isAdmin && !isCreator && !isAssigned) {
        console.log("❌ Permissions insuffisantes");
        socket.emit("task_error", {
          data: {
            message:
              "Vous ne pouvez modifier que les tâches que vous avez créées ou qui vous sont assignées",
          },
        });
        return;
      }

      // Déterminer les champs autorisés
      const allowedFields = isAdmin
        ? ["status", "priority", "assignedTo"]
        : isCreator
        ? ["status", "priority"]
        : isAssigned
        ? ["status"]
        : [];

      console.log("✅ Champs autorisés:", allowedFields);
      console.log("📝 Champs à modifier:", Object.keys(updateData));

      // Vérifier que seuls les champs autorisés sont modifiés
      const nonAllowedFields = Object.keys(updateData).filter(
        (field) => !allowedFields.includes(field)
      );
      if (nonAllowedFields.length > 0) {
        console.log("❌ Champs non autorisés:", nonAllowedFields);
        socket.emit("task_error", {
          data: {
            message:
              "Vous ne pouvez modifier que le statut" +
              (isCreator ? " et la priorité" : ""),
          },
        });
        return;
      }

      console.log("✅ Permissions OK, mise à jour en cours...");

      // Sauvegarder l'ancienne assignation AVANT modification
      const oldAssignedTo = task.assignedTo.toString();

      // Mettre à jour
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          task[field] = updateData[field];
          console.log(`🔄 Mise à jour ${field}:`, updateData[field]);
        }
      });

      await task.save();
      console.log("✅ Tâche sauvegardée");

      const populatedTask = await TaskController.#populateTaskReferences(
        task._id
      );

      // Confirmer à l'émetteur
      socket.emit("task_updated", {
        data: {
          task: populatedTask,
          updatedBy: { _id: socket.user._id, username: socket.user.username },
        },
      });

      // Diffuser la mise à jour à tous les utilisateurs
      socket.broadcast.emit("task_updated", {
        data: {
          task: populatedTask,
          updatedBy: { _id: socket.user._id, username: socket.user.username },
        },
      });

      console.log("✅ Événements Socket.IO envoyés");

      // Gérer les notifications selon le type de changement
      if (updateData.assignedTo && updateData.assignedTo !== oldAssignedTo) {
        // Changement d'assignation : notifier l'ancien et le nouveau assigné
        const newAssignedUserId = updateData.assignedTo;

        // Notification à l'ancien assigné (désassignation)
        socket.to(`user_${oldAssignedTo}`).emit("task_notification", {
          data: {
            type: "task_unassigned",
            task: populatedTask,
            updatedBy: { _id: socket.user._id, username: socket.user.username },
          },
        });

        // Notification au nouveau assigné (assignation)
        socket.to(`user_${newAssignedUserId}`).emit("task_notification", {
          data: {
            type: "task_assigned",
            task: populatedTask,
            updatedBy: { _id: socket.user._id, username: socket.user.username },
          },
        });
      } else {
        // Changement de statut ou autre : notifier l'assigné actuel
        socket
          .to(`user_${populatedTask.assignedTo._id}`)
          .emit("task_notification", {
            data: {
              type: "task_updated",
              task: populatedTask,
              updatedBy: {
                _id: socket.user._id,
                username: socket.user.username,
              },
            },
          });
      }

      // Notification toast à l'émetteur (pour feedback immédiat)
      socket.emit("task_notification", {
        data: {
          type: "task_updated",
          task: populatedTask,
          updatedBy: {
            _id: socket.user._id,
            username: socket.user.username,
          },
        },
      });

      console.log("✅ Mise à jour terminée avec succès");
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour:", error);
      socket.emit("task_error", {
        data: { message: "Erreur lors de la mise à jour" },
      });
    }
  }

  // Méthode pour supprimer une tâche via Socket.IO
  static async deleteTaskViaSocket(socket, taskData) {
    try {
      const { taskId } = taskData;

      const task = await Task.findById(taskId);
      if (!task) {
        socket.emit("task_error", { data: { message: "Tâche non trouvée" } });
        return;
      }

      // Vérifier les permissions
      const isCreator =
        task.createdBy.toString() === socket.user._id.toString();
      const isAdmin = socket.user.role === "admin";

      if (!isCreator && !isAdmin) {
        socket.emit("task_error", {
          data: { message: "Vous n'avez pas les permissions" },
        });
        return;
      }

      // Sauvegarder l'info de l'utilisateur assigné avant suppression
      const assignedUserId = task.assignedTo.toString();

      await Task.findByIdAndDelete(taskId);

      // Confirmer à l'émetteur
      socket.emit("task_deleted", {
        data: {
          taskId: taskId,
          deletedBy: { _id: socket.user._id, username: socket.user.username },
        },
      });

      // Diffuser la suppression à tous les utilisateurs (pour mise à jour de la liste)
      socket.broadcast.emit("task_deleted", {
        data: {
          taskId: taskId,
          deletedBy: { _id: socket.user._id, username: socket.user.username },
        },
      });

      // Notification toast à l'utilisateur assigné
      socket.to(`user_${assignedUserId}`).emit("task_notification", {
        data: {
          type: "task_deleted",
          taskId: taskId,
          assignedUserId: assignedUserId,
          deletedBy: { _id: socket.user._id, username: socket.user.username },
        },
      });

      // Notification toast à l'émetteur (pour feedback immédiat)
      socket.emit("task_notification", {
        data: {
          type: "task_deleted",
          taskId: taskId,
          assignedUserId: assignedUserId,
          deletedBy: { _id: socket.user._id, username: socket.user.username },
        },
      });
    } catch (error) {
      socket.emit("task_error", {
        data: { message: "Erreur lors de la suppression" },
      });
    }
  }

  static async getTasks(req, res) {
    try {
      const tasks = await TaskController.#findByUser(
        req.user._id,
        req.user.role
      );

      // Si l'utilisateur est admin, inclure la liste des utilisateurs
      let users = null;
      if (req.user.role === "admin") {
        users = await User.find({})
          .select("username email _id")
          .sort({ username: 1 });
      }

      res.json({
        success: true,
        data: {
          tasks,
          users, // null pour les non-admins
        },
      });
    } catch (error) {
      handleServerError(error, res, "la récupération des tâches");
    }
  }

  static async getTaskById(req, res) {
    try {
      const { id } = req.params;
      const task = await TaskController.#populateTaskReferences(id);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Tâche non trouvée",
        });
      }

      res.json({ success: true, data: { task } });
    } catch (error) {
      handleServerError(error, res, "la récupération de la tâche");
    }
  }

  static async updateTask(req, res) {
    try {
      const validation = TaskController.#handleValidationErrors(req, res);
      if (validation.hasErrors) return;

      const { id } = req.params;
      const updateData = req.body;

      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Tâche non trouvée",
        });
      }

      // Vérifier les permissions
      const isAdmin = req.user.role === "admin";
      const isCreator = task.createdBy.toString() === req.user._id.toString();

      if (!isAdmin && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Vous n'avez pas les permissions pour modifier cette tâche",
        });
      }

      // Déterminer les champs autorisés
      const allowedFields = isAdmin
        ? ["status", "priority", "assignedTo"]
        : isCreator
        ? ["status", "priority"]
        : ["status"];

      // Vérifier que les non-admins ne modifient que les champs autorisés
      if (!isAdmin) {
        const nonAllowedFields = Object.keys(updateData).filter(
          (field) => !allowedFields.includes(field)
        );
        if (nonAllowedFields.length > 0) {
          return res.status(403).json({
            success: false,
            message:
              "Vous ne pouvez modifier que le statut" +
              (isCreator ? " et la priorité" : ""),
          });
        }
      }

      // Mettre à jour
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          task[field] = updateData[field];
        }
      });

      await task.save();

      const populatedTask = await TaskController.#populateTaskReferences(
        task._id
      );
      res.json({
        success: true,
        message: "Tâche mise à jour avec succès",
        data: { task: populatedTask },
      });
    } catch (error) {
      handleServerError(error, res, "la mise à jour de la tâche");
    }
  }

  static async deleteTask(req, res) {
    try {
      const { id } = req.params;

      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Tâche non trouvée",
        });
      }

      // Vérifier les permissions
      const isAdmin = req.user.role === "admin";
      const isCreator = task.createdBy.toString() === req.user._id.toString();

      if (!isAdmin && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Vous n'avez pas les permissions pour supprimer cette tâche",
        });
      }

      await Task.findByIdAndDelete(task._id);

      res.json({
        success: true,
        message: "Tâche supprimée avec succès",
      });
    } catch (error) {
      handleServerError(error, res, "la suppression de la tâche");
    }
  }

  static async getTaskStats(req, res) {
    try {
      const stats = await Task.aggregate([
        {
          $match: {
            $or: [{ assignedTo: req.user._id }, { createdBy: req.user._id }],
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const statsObject = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        total: 0,
      };

      stats.forEach((stat) => {
        statsObject[stat._id] = stat.count;
        statsObject.total += stat.count;
      });

      res.json({
        success: true,
        data: { stats: statsObject },
      });
    } catch (error) {
      handleServerError(error, res, "la récupération des statistiques");
    }
  }
}

export default TaskController;
