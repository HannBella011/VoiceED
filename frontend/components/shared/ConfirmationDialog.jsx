'use client';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './ConfirmationDialog.module.css';

export default function ConfirmationDialog({
  open,
  title,
  description,
  entity,
  consequences,
  confirmLabel,
  variant = 'danger',
  busy = false,
  confirmDisabled = false,
  error = '',
  onCancel,
  onConfirm,
  children,
  hideActions = false,
  dialogRole = 'alertdialog',
  className = '',
  titleClassName = '',
  subtitle,
  onKeyDown,
}) {
  const descriptionId = useId();
  const panel = useRef(null),
    cancel = useRef(null),
    pending = useRef(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (
      cancel.current ||
      panel.current?.querySelector(
        'input:not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled)'
      ) ||
      panel.current
    )?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus?.();
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    if (busy) panel.current?.focus();
    else if (document.activeElement === panel.current) cancel.current?.focus();
  }, [busy, open]);
  if (!open || typeof document === 'undefined') return null;
  const keys = (event) => {
    onKeyDown?.(event);
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!busy && !pending.current) onCancel();
    }
    if (
      dialogRole === 'alertdialog' &&
      event.key === 'Enter' &&
      event.target.tagName !== 'BUTTON'
    )
      event.preventDefault();
    if (event.key !== 'Tab') return;
    const nodes = [
      ...panel.current.querySelectorAll(
        'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[href],[tabindex="0"]'
      ),
    ];
    if (!nodes.length) {
      event.preventDefault();
      panel.current.focus();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === nodes[0] || document.activeElement === panel.current)
    ) {
      event.preventDefault();
      nodes.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === nodes.at(-1)) {
      event.preventDefault();
      nodes[0].focus();
    }
  };
  const confirm = async () => {
    if (busy || confirmDisabled || pending.current) return;
    pending.current = true;
    try {
      await onConfirm();
    } finally {
      pending.current = false;
    }
  };
  return createPortal(
    <div
      className={styles.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy && !pending.current)
          onCancel();
      }}
    >
      <section
        ref={panel}
        className={`${styles.panel} ${className}`}
        role={dialogRole}
        aria-modal="true"
        aria-label={title}
        aria-describedby={
          description || entity || consequences ? descriptionId : undefined
        }
        aria-busy={busy}
        tabIndex={-1}
        onKeyDown={keys}
      >
        <h2 className={titleClassName}>{title}</h2>
        {subtitle}
        {(description || entity || consequences) && (
          <div id={descriptionId}>
            {description && <p>{description}</p>}
            {entity && <p className={styles.entity}>{entity}</p>}
            {consequences && <p>{consequences}</p>}
          </div>
        )}
        {children}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {!hideActions && (
          <div className="voiceed-actions">
            <button
              ref={cancel}
              type="button"
              className="btn btn--secondary"
              disabled={busy}
              onClick={() => {
                if (!busy && !pending.current) onCancel();
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`btn btn--${variant}`}
              disabled={busy || confirmDisabled}
              onClick={confirm}
            >
              {busy ? 'Processing…' : confirmLabel}
            </button>
          </div>
        )}
      </section>
    </div>,
    document.body
  );
}
