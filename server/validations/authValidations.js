import { body } from "express-validator";

export const registerValidation = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Le nom d'utilisateur doit contenir entre 3 et 30 caractères")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores"
    ),

  body("email").isEmail().normalizeEmail().withMessage("Email invalide"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Le mot de passe doit contenir au moins 6 caractères"),

  body("confirmPassword")
    .notEmpty()
    .withMessage("La confirmation du mot de passe est requise")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Les mots de passe ne correspondent pas");
      }
      return true;
    }),
];

export const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Email invalide"),

  body("password").notEmpty().withMessage("Le mot de passe est requis"),
];
