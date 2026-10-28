'use client';

import React from 'react';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className = '',
  closeOnOverlayClick = true,
  showCloseButton = true,
}) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className={`modal-overlay ${isOpen ? 'show' : ''}`}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div className={`modal modal-${size} ${className}`}>
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && <h2 id="modal-title">{title}</h2>}
            {showCloseButton && (
              <button className="modal-close" onClick={onClose} aria-label="Close modal">
                ×
              </button>
            )}
          </div>
        )}
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
}

export default Modal;