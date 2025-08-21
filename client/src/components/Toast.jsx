import useToastStore from "../stores/toastStore";

const Toast = ({ message, type = "info" }) => {
  const getToastStyles = () => {
    const baseStyles = "p-4 rounded-lg shadow-lg max-w-sm";

    const typeStyles = {
      success: "bg-green-500 text-white",
      error: "bg-red-500 text-white",
      warning: "bg-yellow-500 text-white",
      info: "bg-blue-500 text-white",
    };

    return `${baseStyles} ${typeStyles[type] || typeStyles.info}`;
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
    }
  };

  return (
    <div className={getToastStyles()}>
      <div className="flex items-center">
        <span className="mr-2">{getIcon()}</span>
        <span className="text-sm font-semibold">{message}</span>
      </div>
    </div>
  );
};

// Composant principal qui gère tous les toasts
const ToastSystem = () => {
  const { toasts } = useToastStore();

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} />
      ))}
    </div>
  );
};

export default ToastSystem;
