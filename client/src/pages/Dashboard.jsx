import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import TaskList from "../components/TaskList";
import socketService from "../services/socket";
import useAuthStore from "../stores/authStore";
import useTaskStore from "../stores/taskStore";
import useToastStore from "../stores/toastStore";

const Dashboard = () => {
  const { user, loading, getCurrentUser, logout } = useAuthStore();
  const { loadTasks, updateTaskInStore, addTaskToStore, removeTaskFromStore } =
    useTaskStore();
  const {
    notifyTaskCreated,
    notifyTaskUpdated,
    notifyTaskDeleted,
    notifyError,
  } = useToastStore();
  const navigate = useNavigate();

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser();

      if (!user) {
        // Pas authentifié, rediriger vers login
        navigate("/login");
        return;
      }

      // Charger les tâches
      await loadTasks();

      // La connexion Socket.IO est maintenant gérée dans getCurrentUser
    } catch {
      // En cas d'erreur, rediriger vers login
      navigate("/login");
    }
  };

  // Écouter les événements Socket.IO
  const handleTaskUpdate = (data) => {
    console.log("🔄 Événement task_updated reçu côté client:", data);
    // Le backend envoie une tâche complète, on la remplace dans le store
    const updatedTask = data.data.task;
    console.log("📋 Tâche mise à jour:", updatedTask);
    updateTaskInStore(updatedTask._id, updatedTask);
    console.log("✅ Tâche mise à jour dans le store");
  };

  const handleNewTask = (data) => {
    console.log("🆕 Événement new_task reçu:", data);
    addTaskToStore(data.data.task);
  };

  const handleTaskDeleted = (data) => {
    console.log("🗑️ Événement task_deleted reçu:", data);
    removeTaskFromStore(data.data.taskId);
  };

  const handleTaskCreated = (data) => {
    console.log("✅ Événement task_created reçu:", data);
    addTaskToStore(data.data.task);
    // Cette notification est gérée par handleNewTask
  };

  const handleTaskError = (data) => {
    console.log("❌ Événement task_error reçu:", data);
    notifyError(data.data.message);
  };

  const handleNotification = (data) => {
    // Utiliser le type approprié selon le message
    const { showToast } = useToastStore.getState();
    showToast(data.data.message, data.data.type || "info");
  };

  const handleTaskNotification = (data) => {
    // Gérer les notifications toast spécifiques aux tâches
    const { type, task, updatedBy, deletedBy } = data.data;

    switch (type) {
      case "task_created":
        if (user && task.assignedTo._id.toString() === user._id.toString()) {
          notifyTaskCreated(task.title, task.assignedTo._id, user._id);
        }
        break;
      case "task_updated":
        // Notification pour l'utilisateur assigné à la tâche
        if (user && task.assignedTo._id.toString() === user._id.toString()) {
          notifyTaskUpdated(
            task.title,
            task.assignedTo._id,
            user._id,
            updatedBy
          );
        }
        break;
      case "task_assigned":
        // Notification pour le nouveau assigné
        if (user && task.assignedTo._id.toString() === user._id.toString()) {
          notifyTaskCreated(task.title, task.assignedTo._id, user._id);
        }
        break;
      case "task_unassigned":
        // Notification pour l'ancien assigné
        if (user && task.assignedTo._id.toString() === user._id.toString()) {
          notifyTaskDeleted(task._id, user._id, updatedBy);
        }
        break;
      case "task_deleted":
        if (user && data.data.assignedUserId === user._id.toString()) {
          notifyTaskDeleted(data.data.assignedUserId, user._id, deletedBy);
        }
        break;
      default:
        break;
    }
  };

  const handleLogout = async () => {
    try {
      // La déconnexion Socket.IO est maintenant gérée dans le authStore
      await logout();

      // Rediriger vers la page de connexion
      navigate("/login");
    } catch {
      // En cas d'erreur, forcer la déconnexion locale
      navigate("/login");
    }
  };

  // Intégration Socket.IO
  useEffect(() => {
    checkAuth();

    // Configurer les listeners avec un délai pour s'assurer que Socket.IO est connecté
    const setupSocketListeners = () => {
      console.log("🔌 Configuration des listeners Socket.IO...");
      console.log("📡 Socket connecté:", socketService.isSocketConnected());

      if (socketService.isSocketConnected()) {
        const socket = socketService.socketInstance;
        console.log("🎧 Ajout des listeners sur socket:", socket.id);

        socket.on("task_updated", handleTaskUpdate);
        socket.on("new_task", handleNewTask);
        socket.on("task_deleted", handleTaskDeleted);
        socket.on("task_created", handleTaskCreated);
        socket.on("task_error", handleTaskError);
        socket.on("notification", handleNotification);
        socket.on("task_notification", handleTaskNotification);

        console.log("✅ Listeners Socket.IO configurés");

        return () => {
          console.log("🧹 Nettoyage des listeners Socket.IO");
          socket.off("task_updated", handleTaskUpdate);
          socket.off("new_task", handleNewTask);
          socket.off("task_deleted", handleTaskDeleted);
          socket.off("task_created", handleTaskCreated);
          socket.off("task_error", handleTaskError);
          socket.off("notification", handleNotification);
          socket.off("task_notification", handleTaskNotification);
        };
      } else {
        console.log("❌ Socket.IO non connecté, pas de listeners");
        return () => {};
      }
    };

    // Configurer les listeners immédiatement si Socket.IO est connecté
    let cleanup = setupSocketListeners();

    // Si Socket.IO n'est pas connecté, réessayer après un délai
    if (!socketService.isSocketConnected()) {
      const timer = setTimeout(() => {
        console.log("⏰ Retry configuration des listeners...");
        cleanup = setupSocketListeners();
      }, 1000);

      return () => {
        clearTimeout(timer);
        if (cleanup) cleanup();
      };
    }

    return cleanup;
  }, []);

  // Afficher un loader pendant la vérification d'authentification
  if (loading) {
    return <LoadingSpinner />;
  }

  // Si pas d'utilisateur après vérification, ne rien afficher (redirection en cours)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Gestionnaire de Tâches
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Connecté en tant que{" "}
                <span className="font-semibold">
                  {user.username} {user.role === "admin" && "(admin)"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <TaskList />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
