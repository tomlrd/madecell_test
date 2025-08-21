import express from "express";
import TaskController from "../controllers/taskController.js";
import { authenticateToken } from "../middlewares/auth.js";
import {
  createTaskValidation,
  updateTaskValidation,
} from "../validations/taskValidations.js";

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Créer une nouvelle tâche (tous les utilisateurs authentifiés)
router.post("/", createTaskValidation, TaskController.createTask);

// Obtenir toutes les tâches (tous les utilisateurs authentifiés)
router.get("/", TaskController.getTasks);

// Obtenir les statistiques des tâches (tous les utilisateurs authentifiés)
router.get("/stats", TaskController.getTaskStats);

// Obtenir une tâche par ID (tous les utilisateurs authentifiés)
router.get("/:id", TaskController.getTaskById);

// Mettre à jour une tâche (vérifications dans le contrôleur)
router.put("/:id", updateTaskValidation, TaskController.updateTask);

// Supprimer une tâche (vérifications dans le contrôleur)
router.delete("/:id", TaskController.deleteTask);

export default router;
