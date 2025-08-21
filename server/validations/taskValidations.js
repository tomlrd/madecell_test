import { body } from "express-validator";

export const createTaskValidation = [
  body("title")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Le titre doit contenir entre 1 et 200 caractères"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("La description ne peut pas dépasser 1000 caractères"),

  body("assignedTo")
    .isMongoId()
    .withMessage("ID d'utilisateur assigné invalide"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priorité invalide"),

  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Date d'échéance invalide")
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error("La date d'échéance doit être dans le futur");
      }
      return true;
    }),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Les tags doivent être un tableau"),

  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Chaque tag doit contenir entre 1 et 50 caractères"),
];

export const updateTaskValidation = [
  body("status")
    .optional()
    .isIn(["pending", "in_progress", "completed", "cancelled"])
    .withMessage("Statut invalide"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priorité invalide"),

  body("assignedTo")
    .optional()
    .isMongoId()
    .withMessage("ID d'utilisateur invalide"),
];
