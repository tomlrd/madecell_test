import { useState } from "react";
import useAuthStore from "../stores/authStore";
import useTaskStore from "../stores/taskStore";

const TaskCard = ({ task, onUpdate, onDelete }) => {
  const { user } = useAuthStore();
  const { users } = useTaskStore();
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "low":
        return "bg-gray-100 text-gray-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "urgent":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "En attente";
      case "in_progress":
        return "En cours";
      case "completed":
        return "Terminée";
      case "cancelled":
        return "Annulée";
      default:
        return status;
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case "low":
        return "Faible";
      case "medium":
        return "Moyenne";
      case "high":
        return "Élevée";
      case "urgent":
        return "Urgente";
      default:
        return priority;
    }
  };

  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    try {
      onUpdate({ status: newStatus });
    } catch {
      // Les erreurs viennent du backend via Socket.IO
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    setIsUpdating(true);
    try {
      onUpdate({ priority: newPriority });
    } catch {
      // Les erreurs viennent du backend via Socket.IO
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssignmentChange = async (newAssignedTo) => {
    setIsUpdating(true);
    try {
      onUpdate({ assignedTo: newAssignedTo });
    } catch {
      // Les erreurs viennent du backend via Socket.IO
    } finally {
      setIsUpdating(false);
    }
  };
  const handleDelete = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) {
      setIsUpdating(true);
      try {
        onDelete();
      } catch {
        // Les erreurs viennent du backend via Socket.IO
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Aucune date";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
        <div className="flex space-x-2">
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(
              task.priority
            )}`}
          >
            {getPriorityText(task.priority)}
          </span>
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
              task.status
            )}`}
          >
            {getStatusText(task.status)}
          </span>
        </div>
      </div>

      {task.description && (
        <p className="text-gray-600 mb-4 line-clamp-2">{task.description}</p>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-500">
          <span className="font-semibold">Assignée à:</span>
          <span className="ml-2">
            {task.assignedTo?.username || "Utilisateur inconnu"}
          </span>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <span className="font-semibold">Créée par:</span>
          <span className="ml-2">
            {task.createdBy?.username || "Utilisateur inconnu"}
          </span>
        </div>
        {task.dueDate && (
          <div className="flex items-center text-sm text-gray-500">
            <span className="font-semibold">Échéance:</span>
            <span className="ml-2">{formatDate(task.dueDate)}</span>
          </div>
        )}
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t pt-4 space-y-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Statut:
          </label>
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isUpdating}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
          >
            <option value="pending">En attente</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Assignée à:
          </label>
          {user?.role === "admin" ? (
            <select
              value={task.assignedTo._id}
              onChange={(e) => handleAssignmentChange(e.target.value)}
              disabled={isUpdating}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
            >
              {users.length === 0 ? (
                <option value="">Aucun utilisateur disponible</option>
              ) : (
                users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.username}
                  </option>
                ))
              )}
            </select>
          ) : (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
              {task.assignedTo?.username || "Utilisateur inconnu"} (
              {task.assignedTo?.email || "Email inconnu"})
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Priorité:
          </label>
          <select
            value={task.priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            disabled={isUpdating}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
          >
            <option value="low">Faible</option>
            <option value="medium">Moyenne</option>
            <option value="high">Élevée</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>

        <div className="pt-2">
          <button
            onClick={handleDelete}
            disabled={isUpdating}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isUpdating ? "Suppression..." : "Supprimer la tâche"}
          </button>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        Créée le {formatDate(task.createdAt)}
      </div>
    </div>
  );
};

export default TaskCard;
