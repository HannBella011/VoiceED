'use client';
import ConfirmationDialog from './ConfirmationDialog';

export default function FormDialog({ open, title, busy, onClose, children }) {
  return (
    <ConfirmationDialog
      open={open}
      title={title}
      busy={busy}
      onCancel={onClose}
      hideActions
      dialogRole="dialog"
    >
      {children}
    </ConfirmationDialog>
  );
}
