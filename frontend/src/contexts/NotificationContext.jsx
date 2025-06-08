import React, { createContext, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';  // Recommend installing uuid package

export const NotificationContext = createContext();
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  
  const addNotification = (message, type = "info") => {
    const id = uuidv4();  // Guaranteed unique identifier
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeNotification(id);
    }, 4000);
  };
  
  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };
  
  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};