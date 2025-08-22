import { create } from "zustand";
import socketService from "../services/socket";
import api from "../utils/apiClient";

const useTaskStore = create((set) => ({
  // État
  tasks: [],
  users: [], // Liste des utilisateurs pour les admins
  loading: false,
  error: null,

  // Actions principales
  loadTasks: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get("/tasks");
      const { tasks, users } = response.data.data;
      set({
        tasks,
        users: users || [], // Liste des utilisateurs si admin, sinon tableau vide
        loading: false,
      });
    } catch (error) {
      // Les erreurs viennent du backend
      const errorMessage = error.response?.data?.message;
      set({ error: errorMessage, loading: false });
    }
  },

  createTask: async (taskData) => {
    socketService.createTask(taskData);
  },

  updateTask: async (taskId, updates) => {
    socketService.updateTask(taskId, updates);
  },

  deleteTask: async (taskId) => {
    socketService.deleteTask(taskId);
  },

  clearError: () => set({ error: null }),

  // Actions internes pour les mises à jour Socket.IO
  updateTaskInStore: (taskId, updates) => {
    set((state) => {
      const updatedTasks = state.tasks.map((task) => {
        if (task._id === taskId) {
          // Si updates est une tâche complète (avec _id), on la remplace entièrement
          if (updates && updates._id) {
            return updates;
          }
          // Sinon, on applique les mises à jour partielles
          return { ...task, ...updates };
        }
        return task;
      });

      return { tasks: updatedTasks };
    });
  },

  addTaskToStore: (task) => {
    set((state) => ({
      tasks: [task, ...state.tasks.filter((t) => t._id !== task._id)],
    }));
  },

  removeTaskFromStore: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task._id !== taskId),
    }));
  },
}));

export default useTaskStore;
