import { useState } from "react";
import useTaskStore from "../stores/taskStore";
import CreateTaskForm from "./CreateTaskForm";
import TaskCard from "./TaskCard";

const TaskList = () => {
  const { tasks, loading, error, updateTask, deleteTask } = useTaskStore();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleTaskCreated = () => {
    setShowCreateForm(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-600 p-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec bouton de création */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          + Nouvelle tâche
        </button>
      </div>

      {/* Liste des tâches */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Aucune tâche dans le système
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onUpdate={(updateData) => updateTask(task._id, updateData)}
                onDelete={() => deleteTask(task._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de création de tâche */}
      {showCreateForm && (
        <CreateTaskForm
          onTaskCreated={handleTaskCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};

export default TaskList;
