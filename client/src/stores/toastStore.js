import { create } from "zustand";

const useToastStore = create((set, get) => ({
  // État
  toasts: [],

  // Actions
  showToast: (message, type = "info", duration = 5000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Supprimer automatiquement après la durée spécifiée
    setTimeout(() => {
      get().removeToast(id);
    }, duration);

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  clearAllToasts: () => {
    set({ toasts: [] });
  },

  // Méthodes de notification spécifiques pour les tâches
  notifyTaskCreated: (taskTitle, assignedUserId, currentUserId) => {
    // Notification seulement si l'utilisateur est assigné à la tâche
    if (assignedUserId === currentUserId) {
      get().showToast(`Nouvelle tâche assignée: "${taskTitle}"`, "success");
    }
  },

  notifyTaskUpdated: (taskTitle, assignedUserId, currentUserId, updatedBy) => {
    // Notification seulement si l'utilisateur est assigné à la tâche
    if (assignedUserId === currentUserId) {
      get().showToast(
        `Tâche "${taskTitle}" mise à jour par ${updatedBy.username}`,
        "success"
      );
    }
  },

  notifyTaskDeleted: (assignedUserId, currentUserId, deletedBy) => {
    // Notification seulement si l'utilisateur était assigné à la tâche
    if (assignedUserId === currentUserId) {
      get().showToast(`Tâche supprimée par ${deletedBy.username}`, "warning");
    }
  },

  // Méthodes de notification pour les actions locales
  notifyError: (message) => {
    get().showToast(message, "error");
  },
}));

export default useToastStore;
