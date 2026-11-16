// Modal - VoiceED
// Base modal wrapper component

'use client';

import React from 'react';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className = '',
}) {
  if (!isOpen) return null;

  const sizeClass = `modal-${size}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal ${sizeClass} ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {title && (
          <div className="modal-header">
            <h3 id="modal-title">{title}</h3>
            <button className="modal-close" onClick={onClose} aria-label="Close modal">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
