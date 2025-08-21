import { useEffect, useState } from "react";
import useAuthStore from "../stores/authStore";
import useTaskStore from "../stores/taskStore";
import useToastStore from "../stores/toastStore";

const CreateTaskForm = ({ onTaskCreated, onCancel }) => {
  const { user } = useAuthStore();
  const { createTask, users } = useTaskStore();
  const { notifyError } = useToastStore();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    dueDate: "",
    tags: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "admin";

  // Initialiser l'assignation pour les non-admins
  useEffect(() => {
    if (!isAdmin && user?._id) {
      setFormData((prev) => ({
        ...prev,
        assignedTo: user._id,
      }));
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const taskData = {
        ...formData,
        // Pour les non-admins, assigner automatiquement à l'utilisateur actuel
        assignedTo: isAdmin ? formData.assignedTo : user._id,
        tags: formData.tags
          ? formData.tags.split(",").map((tag) => tag.trim())
          : [],
        dueDate: formData.dueDate
          ? new Date(formData.dueDate).toISOString()
          : null,
      };

      // Créer la tâche via le store
      await createTask(taskData);

      // Réinitialiser le formulaire
      setFormData({
        title: "",
        description: "",
        assignedTo: "",
        priority: "medium",
        dueDate: "",
        tags: "",
      });

      // Fermer le modal immédiatement
      onTaskCreated();
    } catch (error) {
      // Les erreurs viennent du backend via Socket.IO
      setError(
        error.response?.data?.message ||
          "Erreur lors de la création de la tâche"
      );
      notifyError(
        error.response?.data?.message ||
          "Erreur lors de la création de la tâche"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Créer une nouvelle tâche
            {!isAdmin && (
              <span className="block text-sm text-gray-500 font-normal mt-1">
                (Vous ne pouvez créer que pour vous-même)
              </span>
            )}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Titre *
              </label>
              <input
                type="text"
                name="title"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Titre de la tâche"
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Description de la tâche"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Assignée à *
              </label>
              {isAdmin ? (
                <select
                  name="assignedTo"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.assignedTo}
                  onChange={handleChange}
                >
                  <option value="">Sélectionner un utilisateur</option>
                  {users.length === 0 ? (
                    <option value="">Aucun utilisateur disponible</option>
                  ) : (
                    users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.username} ({user.email})
                      </option>
                    ))
                  )}
                </select>
              ) : (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                  {user?.username} (vous-même)
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Priorité
              </label>
              <select
                name="priority"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Élevée</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Date d'échéance
              </label>
              <input
                type="datetime-local"
                name="dueDate"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.dueDate}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tags (séparés par des virgules)
              </label>
              <input
                type="text"
                name="tags"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="frontend, bug, urgent"
                value={formData.tags}
                onChange={handleChange}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">
                {typeof error === "string"
                  ? error
                  : "Erreur lors de la création de la tâche"}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? "Création..." : "Créer la tâche"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTaskForm;
