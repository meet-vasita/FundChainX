// src/components/common/CommonComponents.jsx
import React from 'react';
import '../../styles/CommonComponents.css';

const Alert = ({ type, message, onClose }) => {
  return (
    <div className={`alert alert-${type}`}>
      <span>{message}</span>
      {onClose && <button className="alert-close" onClick={onClose}>×</button>}
    </div>
  );
};

const Button = ({ children, onClick, disabled, className, type = 'button' }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`button ${className || ''}`}
    >
      {children}
    </button>
  );
};


const Card = ({ children, className }) => {
  return <div className={`card ${className || ''}`}>{children}</div>;
};

const Input = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  className,
  required
}) => {
  return (
    <div className={`input-group ${className || ''}`}>
      {label && <label>{label}</label>}
      {type === 'textarea' ? (
        <textarea
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={error ? 'input-error' : ''}
          required={required}
        />
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={error ? 'input-error' : ''}
          required={required}
        />
      )}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};


const Loader = () => {
  return (
    <div className="loader-container">
      <div className="loader"></div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        {children}
      </div>
    </div>
  );
};

const ProgressBar = ({ progress }) => {
  return (
    <div className="progress-bar">
      <div className="progress" style={{ width: `${progress}%` }}></div>
    </div>
  );
};

const Spinner = () => {
  return <div className="spinner"></div>;
};

export {
  Alert,
  Button,
  Card,
  Input,
  Loader,
  Modal,
  ProgressBar,
  Spinner
};