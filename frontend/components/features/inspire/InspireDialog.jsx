'use client';
import { useEffect, useRef } from 'react';

export default function InspireDialog({ title, onClose, children, busy = false }) {
  const content = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    content.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);
  const keys = (event) => {
    if (event.key === 'Escape' && !busy) {
      event.stopPropagation();
      onClose();
    }
    if (event.key !== 'Tab') return;
    const nodes = [
      ...content.current.querySelectorAll(
        'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[contenteditable="true"]'
      ),
    ].filter((node) => !node.closest('[hidden]'));
    if (!nodes.length) {
      event.preventDefault();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === nodes[0] ||
        document.activeElement === content.current)
    ) {
      event.preventDefault();
      nodes[nodes.length - 1].focus();
    } else if (!event.shiftKey && document.activeElement === nodes[nodes.length - 1]) {
      event.preventDefault();
      nodes[0].focus();
    }
  };
  return (
    <div
      className="modal show inspire-dialog"
      style={{ display: 'flex' }}
      onClick={() => !busy && onClose()}
    >
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={content}
        tabIndex={-1}
        onKeyDown={keys}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="close-button"
          type="button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
