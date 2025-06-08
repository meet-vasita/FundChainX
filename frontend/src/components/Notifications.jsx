import React from "react";
import { useNotification } from "../contexts/NotificationContext";
import "../styles/Notifications.css";

const Notification = ({ message, type, onClose }) => {
  return (
    <div className={`notification ${type}`}>
      {message}
      <button onClick={onClose} className="close-btn">×</button>
    </div>
  );
};

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;