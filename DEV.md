# Guide de Développement - Task Management API

> **Note** : Ce fichier se trouve dans le dossier `server/` et contient la documentation technique détaillée du backend. Pour la documentation générale du projet, voir `README.md` à la racine.

## 📚 Architecture et Concepts

### 🔐 Logiques des Permissions Admin/User

#### **Rôles et Permissions**

| Rôle      | Permissions                                                                                                                                                                             | Restrictions                                                                                                         |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **User**  | • Créer des tâches (pour soi-même)<br>• Modifier le statut (si assigné/créateur)<br>• Modifier la priorité (si créateur)<br>• Supprimer (si créateur)<br>• Voir toutes les tâches       | • Ne peut assigner qu'à soi-même<br>• Ne peut pas modifier l'assignation<br>• Ne peut pas modifier titre/description |
| **Admin** | • Toutes les permissions user<br>• Créer des tâches pour n'importe qui<br>• Modifier l'assignation<br>• Modifier la priorité de toutes les tâches<br>• Supprimer n'importe quelle tâche | • Aucune restriction                                                                                                 |

#### **Logique de Permissions dans les Contrôleurs**

```javascript
// Socket.IO - Mise à jour de tâche
const isAdmin = socket.user.role === "admin";
const isCreator = task.createdBy.toString() === socket.user._id.toString();

const allowedFields = isAdmin
  ? ["status", "priority", "assignedTo"] // Admin : tout
  : isCreator
  ? ["status", "priority"] // Créateur : statut + priorité
  : ["status"]; // Autres : statut seulement
```

#### **Sécurité Multi-niveaux**

1. **Front-end** : Interface adaptée selon les permissions
2. **Back-end** : Validation stricte des permissions
3. **Base de données** : Contraintes au niveau du schéma
4. **Socket.IO** : Authentification et autorisation

---

### 🔄 Cycle de Vie d'une Task

#### **1. Création**

```javascript
// Flux de création
User → Front-end → Validation → Back-end → Database → Socket.IO → Notifications
```

**Étapes :**

- **Validation** : Express-validator + Mongoose schema
- **Permissions** : Vérification des droits de création
- **Assignation** : Auto-assignation pour non-admin
- **Notification** : Toast à l'utilisateur assigné
- **Broadcast** : Mise à jour de la liste pour tous

#### **2. Modification**

```javascript
// Flux de modification
User → Front-end → Validation → Back-end → Permissions → Database → Socket.IO → Notifications
```

**Champs modifiables :**

- **Statut** : `pending` → `in_progress` → `completed`/`cancelled`
- **Priorité** : `low` → `medium` → `high` → `urgent`
- **Assignation** : Changement d'utilisateur assigné (admin seulement)

#### **3. Suppression**

```javascript
// Flux de suppression
User → Confirmation → Back-end → Permissions → Database → Socket.IO → Notifications
```

**Permissions :**

- **Créateur** : Peut supprimer sa tâche
- **Admin** : Peut supprimer n'importe quelle tâche
- **Autres** : Pas de permission

#### **4. États de la Tâche**

| État          | Description | Transitions possibles        |
| ------------- | ----------- | ---------------------------- |
| `pending`     | En attente  | → `in_progress`, `cancelled` |
| `in_progress` | En cours    | → `completed`, `cancelled`   |
| `completed`   | Terminée    | → `in_progress` (retour)     |
| `cancelled`   | Annulée     | → `pending` (retour)         |

---

### 👤 Cycle de Vie d'un User/Admin

#### **1. Inscription**

```javascript
// Flux d'inscription
User → Front-end → Validation → Back-end → Hash Password → Database → JWT → Login
```

**Validation :**

- Email unique et valide
- Mot de passe fort (8+ caractères, majuscule, minuscule, chiffre)
- Username unique (3-30 caractères alphanumériques)

#### **2. Connexion**

```javascript
// Flux de connexion
User → Credentials → Validation → Back-end → Verify Password → JWT → Socket.IO
```

**Sécurité :**

- Token JWT avec expiration
- Refresh token en HttpOnly cookie
- Authentification Socket.IO

#### **3. Session Active**

```javascript
// Gestion de session
JWT → Middleware → User Context → Socket.IO Room → Real-time Updates
```

**Fonctionnalités :**

- Accès aux tâches selon les permissions
- Notifications en temps réel
- Mise à jour automatique de l'interface

#### **4. Déconnexion**

```javascript
// Flux de déconnexion
User → Logout → Clear JWT → Disconnect Socket.IO → Clear State
```

---

### 🔔 Cycle de Vie des Notifications

#### **1. Types de Notifications**

| Type           | Déclencheur           | Destinataire                    | Message                                       |
| -------------- | --------------------- | ------------------------------- | --------------------------------------------- |
| `task_created` | Création de tâche     | Utilisateur assigné             | "Nouvelle tâche assignée: [titre]"            |
| `task_updated` | Modification de tâche | Utilisateur assigné             | "Tâche [titre] mise à jour par [utilisateur]" |
| `task_deleted` | Suppression de tâche  | Utilisateur assigné             | "Tâche supprimée par [utilisateur]"           |
| `task_error`   | Erreur d'opération    | Utilisateur qui a fait l'action | Message d'erreur spécifique                   |

#### **2. Flux de Notification**

```javascript
// Flux complet
Action → Back-end → Socket.IO → Room → Client → Toast Store → UI
```

**Étapes détaillées :**

1. **Action utilisateur** : Création/modification/suppression
2. **Validation serveur** : Permissions et données
3. **Émission Socket.IO** : `task_notification` vers la room de l'assigné
4. **Réception client** : `handleTaskNotification` dans Dashboard
5. **Toast Store** : `notifyTaskCreated/Updated/Deleted`
6. **Affichage UI** : Toast avec message approprié

#### **3. Système de Rooms Socket.IO**

```javascript
// Gestion des rooms
User Connection → Join Room `user_${userId}` → Targeted Notifications
```

**Avantages :**

- Notifications ciblées (seulement l'assigné)
- Pas de spam pour les autres utilisateurs
- Mise à jour de liste pour tous (broadcast séparé)

#### **4. Gestion des Erreurs de Notification**

```javascript
// Fallback en cas d'échec
Socket.IO Error → HTTP API → Error Toast → User Feedback
```

---

### ❌ Cycle de Vie des Erreurs

#### **1. Types d'Erreurs**

| Type                 | Niveau      | Gestion           | Exemple                     |
| -------------------- | ----------- | ----------------- | --------------------------- |
| **Validation**       | Front-end   | Toast d'erreur    | "Titre requis"              |
| **Authentification** | Middleware  | Redirection login | "Token expiré"              |
| **Autorisation**     | Contrôleur  | Toast d'erreur    | "Permissions insuffisantes" |
| **Base de données**  | Utilitaires | Log + Toast       | "Erreur interne"            |
| **Socket.IO**        | Service     | Toast d'erreur    | "Connexion perdue"          |

#### **2. Flux de Gestion d'Erreur**

```javascript
// Flux d'erreur
Error → Handler → Log → Response → Client → Toast → User
```

**Niveaux de gestion :**

1. **Validation** : Express-validator + Mongoose
2. **Middleware** : Authentification + Permissions
3. **Contrôleur** : Logique métier + Permissions
4. **Utilitaires** : Gestion centralisée des erreurs
5. **Client** : Affichage utilisateur + Retry

#### **3. Gestion Centralisée**

```javascript
// Utilitaires d'erreur
export const handleServerError = (error, res, operation) => {
  if (process.env.NODE_ENV === "development") {
    console.error(`❌ Erreur lors de ${operation}:`, error);
  }
  return res.status(500).json({
    success: false,
    message: "Erreur interne du serveur",
  });
};
```

#### **4. Logs et Debug**

```javascript
// Stratégie de logging
Development → Console détaillé
Production → Logs essentiels seulement
```

---

### 🏗️ Méthodes Static et Privées

#### **Pourquoi utiliser des méthodes static ?**

```javascript
class TaskController {
  // ✅ STATIC : Pas d'instance nécessaire
  static async createTask(req, res) { ... }
  static async getTasks(req, res) { ... }

  // ❌ INSTANCE : Nécessite new TaskController()
  async createTask(req, res) { ... }
}
```

**Avantages :**

- **Simplicité** : Pas de gestion d'instances
- **Performance** : Pas d'allocation mémoire
- **Stateless** : Pas d'état partagé entre requêtes
- **Express-friendly** : Compatible avec les middlewares Express

#### **Pourquoi utiliser des méthodes privées ?**

```javascript
class TaskController {
  // ✅ PUBLIC : Interface claire
  static async createTask(req, res) { ... }

  // ✅ PRIVÉ : Détails cachés
  static #handleValidationErrors(req, res) { ... }
  static #populateTaskReferences(taskId) { ... }
}
```

**Avantages :**

- **Encapsulation** : Cache la complexité interne
- **Sécurité** : Contrôle d'accès aux méthodes sensibles
- **Maintenance** : Évolution sans casser l'API publique
- **Lisibilité** : Interface claire et professionnelle

---

### ✅ Express-Validators vs Schemas MongoDB

#### **Pourquoi les deux ?**

```javascript
// 🗄️ Schema MongoDB (Validation structurelle)
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  priority: { type: String, enum: ["low", "medium", "high"] },
  dueDate: { type: Date, min: Date.now },
});

// ✅ Express-Validator (Validation métier)
export const createTaskValidation = [
  body("title")
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Le titre doit contenir entre 3 et 200 caractères"),
  body("dueDate")
    .isISO8601()
    .custom((value) => new Date(value) > new Date())
    .withMessage("La date d'échéance doit être dans le futur"),
];
```

#### **Différences et Complémentarité**

| Aspect           | Schema MongoDB      | Express-Validator          |
| ---------------- | ------------------- | -------------------------- |
| **Niveau**       | Base de données     | Couche applicative         |
| **Timing**       | Avant sauvegarde    | Avant traitement           |
| **Complexité**   | Validation simple   | Validation métier complexe |
| **Messages**     | Messages génériques | Messages personnalisés     |
| **Sanitisation** | Basique             | Avancée                    |

#### **Avantages des Express-Validators**

1. **Validation Métier Complexe**

```javascript
body("password")
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage("Mot de passe trop faible");
```

2. **Messages d'Erreur Personnalisés**

```javascript
body("email").isEmail().withMessage("Veuillez fournir un email valide");
```

3. **Sanitisation des Données**

```javascript
body('email').normalizeEmail(),
body('username').trim().escape(),
```

4. **Performance**

```javascript
// Validation avant traitement coûteux
const validation = validationResult(req);
if (!validation.isEmpty()) {
  return res.status(400).json({ errors: validation.array() });
}
// Seulement après validation → requête DB
```

---

## 🎯 Architecture Complète

### **Flux de Données**

```
┌─────────────────────────────────────┐
│           Front-end (React)         │
│  ├─ Zustand Stores (State)          │
│  ├─ Socket.IO Client (Real-time)    │
│  └─ Axios (HTTP API)                │
├─────────────────────────────────────┤
│           Socket.IO Server          │
│  ├─ Authentication                  │
│  ├─ Real-time Events               │
│  └─ Notifications                  │
├─────────────────────────────────────┤
│           Express Server            │
│  ├─ Routes (API Endpoints)          │
│  ├─ Controllers (Business Logic)    │
│  ├─ Middlewares (Auth/Validation)   │
│  └─ Validators (Data Validation)    │
├─────────────────────────────────────┤
│           MongoDB (Database)        │
│  ├─ Schemas (Data Structure)        │
│  ├─ Indexes (Performance)           │
│  └─ Validation (Data Integrity)     │
└─────────────────────────────────────┘
```

### **Sécurité Multi-niveaux**

1. **Front-end** : Validation côté client + Interface adaptée
2. **Socket.IO** : Authentification + Rooms personnalisées
3. **Express** : Middlewares d'authentification + Validation
4. **MongoDB** : Contraintes de schéma + Index de sécurité

### **Performance et Scalabilité**

- **Index MongoDB** : Optimisation des requêtes fréquentes
- **Socket.IO Rooms** : Notifications ciblées
- **Validation précoce** : Évite les traitements inutiles
- **Gestion d'erreur centralisée** : Logs et monitoring
