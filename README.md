# 🚀 Task Management - Application de Gestion de Tâches en Temps Réel

Application complète de gestion de tâches avec authentification, temps réel et notifications, construite avec React, Node.js, Socket.IO et MongoDB.

## 📋 Table des Matières

- [🚀 Installation et Lancement](#-installation-et-lancement)
- [🏗️ Architecture](#️-architecture)
- [📊 Modèles de Données](#-modèles-de-données)
- [🔄 Flux d'Événements](#-flux-dévénements)
- [⚙️ Choix Techniques](#️-choix-techniques)
- [🔧 Fonctionnalités](#-fonctionnalités)
- [🚀 Améliorations Possibles](#-améliorations-possibles)
- [📝 Note de Développement](#-note-de-développement)

## 🚀 Installation et Lancement

### Prérequis

- **Node.js** (v18+)
- **MongoDB** (v5+)
- **npm** ou **yarn**

### Installation

1. **Cloner le projet :**

```bash
git clone <repository-url>
cd madecell_test
```

2. **Installer les dépendances :**

```bash
# Client (React)
cd client
npm install

# Serveur (Node.js)
cd ../server
npm install
```

3. **Configuration :**

```bash
cd server

# Modifier .env avec vos paramètres
MONGODB_URI=mongodb://localhost:27017/task-management
JWT_SECRET=votre_secret_jwt_tres_securise
JWT_REFRESH_SECRET=votre_refresh_secret_tres_securise
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
PORT=3001
```

### Lancement

1. **Démarrer le serveur :**

```bash
cd server
npm run dev
# Serveur disponible sur http://localhost:3001
```

2. **Démarrer le client :**

```bash
cd client
npm run dev
# Application disponible sur http://localhost:3000
```

## 🏗️ Architecture

```
madecell_test/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Composants React
│   │   ├── pages/         # Pages de l'application
│   │   ├── stores/        # Stores Zustand
│   │   ├── services/      # Services (Socket.IO)
│   │   └── utils/         # Utilitaires
│   └── package.json
├── server/                 # Backend Node.js
│   ├── controllers/       # Contrôleurs métier
│   ├── models/           # Modèles MongoDB
│   ├── routes/           # Routes API
│   ├── middlewares/      # Middlewares Express
│   ├── services/         # Services (Socket.IO)
│   ├── validations/      # Validation des données
│   └── package.json
├── README.md             # Ce fichier
└── DEV.md               # Documentation technique détaillée
```

### Stack Technique

| Frontend     | Backend  | Base de Données | Temps Réel   |
| ------------ | -------- | --------------- | ------------ |
| React 19     | Node.js  | MongoDB         | Socket.IO    |
| Zustand      | Express  | Mongoose        | Rooms        |
| Tailwind CSS | JWT      | Validation      | Events       |
| Vite         | bcryptjs | Indexes         | Broadcasting |

## 📊 Modèles de Données

### User

```javascript
{
  _id: ObjectId,
  username: String (unique, 3-30 chars),
  email: String (unique, lowercase),
  password: String (hashé avec bcrypt),
  role: String (enum: "user", "admin"),
  createdAt: Date,
  updatedAt: Date
}
```

### Task

```javascript
{
  _id: ObjectId,
  title: String (required, max 200 chars),
  description: String (max 1000 chars),
  status: String (enum: "pending", "in_progress", "completed", "cancelled"),
  priority: String (enum: "low", "medium", "high", "urgent"),
  assignedTo: ObjectId (ref: User, required),
  createdBy: ObjectId (ref: User, required),
  dueDate: Date (optionnel),
  tags: [String],
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes MongoDB

```javascript
// Performance des requêtes fréquentes
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
```

## 🔄 Flux d'Événements

### 1. Authentification

```
User → Login → JWT Access Token → Socket.IO Connection → User Room
```

### 2. Création de Tâche

```
User → Frontend → Validation → Backend → Database → Socket.IO → Notifications
```

### 3. Mise à Jour Temps Réel

```
Action → Socket.IO → Server → Database → Broadcast → All Clients → UI Update
```

### 4. Notifications

```
Event → Server → User Room → Client → Toast Store → UI Toast
```

### Système de Rooms Socket.IO

```javascript
// Chaque utilisateur rejoint sa room personnelle
socket.join(`user_${userId}`);

// Notifications ciblées
socket.to(`user_${assignedUserId}`).emit("task_notification", data);
```

## ⚙️ Choix Techniques

### Frontend

#### **Zustand vs Redux**

- **Zustand** : Plus simple, moins de boilerplate
- **Stores séparés** : `authStore`, `taskStore`, `toastStore`
- **Pas de Provider** : Import direct dans les composants

#### **Socket.IO Client**

- **Service singleton** : Une seule connexion par session
- **Méthodes CRUD** : `createTask`, `updateTask`, `deleteTask`
- **Gestion d'erreurs** : Reconnexion automatique

### Backend

#### **Architecture MVC**

- **Controllers** : Logique métier centralisée
- **Models** : Validation et relations MongoDB
- **Routes** : Endpoints API RESTful

#### **Authentification JWT**

- **Double token** : Access (15min) + Refresh (7 jours)
- **HttpOnly cookies** : Refresh token sécurisé
- **Socket.IO auth** : Middleware d'authentification

#### **Validation Multi-niveaux**

```javascript
// Express-Validator (validation métier)
body("title").isLength({ min: 3, max: 200 })

// Mongoose Schema (validation structurelle)
title: { type: String, required: true, maxlength: 200 }
```

### Base de Données

#### **MongoDB + Mongoose**

- **Flexibilité** : Schéma évolutif
- **Performance** : Index optimisés
- **Relations** : Population automatique

#### **Sécurité**

- **Mots de passe hashés** : bcrypt avec salt rounds 12
- **Validation** : Sanitisation des données
- **Permissions** : Vérification côté serveur

## 🔧 Fonctionnalités

### 👤 Gestion des Utilisateurs

- **Inscription/Connexion** avec validation
- **Rôles** : User et Admin
- **Sessions persistantes** avec refresh token
- **Profil utilisateur** avec informations

### 📋 Gestion des Tâches

- **CRUD complet** : Création, lecture, mise à jour, suppression
- **Permissions granulaires** :
  - **Admin** : Toutes les permissions
  - **User** : Création pour soi, modification limitée
- **Statuts** : En attente, En cours, Terminée, Annulée
- **Priorités** : Faible, Moyenne, Élevée, Urgente

### 🔔 Notifications Temps Réel

- **Toast notifications** : Système personnalisé
- **Notifications ciblées** : Seulement pour l'utilisateur assigné
- **Types** : Success, Error, Warning, Info
- **Auto-dismiss** : Disparition automatique

### 🔄 Temps Réel

- **Socket.IO** : Connexion WebSocket
- **Mise à jour instantanée** : Pas de rafraîchissement
- **Indicateur de connexion** : Statut visuel
- **Reconnexion automatique** : Gestion des déconnexions

### 🎨 Interface Utilisateur

- **Design moderne** : Tailwind CSS
- **Responsive** : Mobile, tablette, desktop
- **Accessibilité** : Focus states, ARIA labels
- **UX optimisée** : Feedback visuel immédiat

## 🚀 Améliorations Possibles

### Fonctionnalités Avancées

- **Filtres et tri** : Par statut, priorité, date, assigné
- **Recherche** : Recherche textuelle dans les tâches
- **Pagination** : Gestion de grandes listes
- **Export** : PDF, Excel des tâches

### Performance

- **Cache Redis** : Mise en cache des données fréquentes
- **Lazy loading** : Chargement à la demande
- **Optimistic updates** : Mise à jour optimiste de l'UI

## 📝 Note de Développement

### Ce qui aurait été ajouté avec plus de temps

#### **Tri et Filtres des Tâches** 🎯

```javascript
// Filtres côté client
const filteredTasks = tasks.filter((task) => {
  return (
    (statusFilter === "all" || task.status === statusFilter) &&
    (priorityFilter === "all" || task.priority === priorityFilter) &&
    (assignedFilter === "all" || task.assignedTo._id === assignedFilter)
  );
});

// Tri dynamique
const sortedTasks = filteredTasks.sort((a, b) => {
  switch (sortBy) {
    case "createdAt":
      return new Date(b.createdAt) - new Date(a.createdAt);
    case "dueDate":
      return new Date(a.dueDate) - new Date(b.dueDate);
    case "priority":
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    default:
      return 0;
  }
});
```

#### **Interface de Filtrage**

- **Filtres multiples** : Statut, priorité, assigné, créateur
- **Tri dynamique** : Date, priorité, titre
- **Recherche textuelle** : Dans le titre et la description
- **Sauvegarde des préférences** : localStorage
