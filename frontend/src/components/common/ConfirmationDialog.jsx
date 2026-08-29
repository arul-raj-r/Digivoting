import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  isLoading = false,
}) {
  const icons = {
    warning: <AlertTriangle className="h-6 w-6 text-amber-500" />,
    danger: <AlertCircle className="h-6 w-6 text-rose-500" />,
    info: <HelpCircle className="h-6 w-6 text-gov-blue dark:text-gov-slate" />,
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <div className="flex gap-4">
        <div className="shrink-0">{icons[type]}</div>
        <div className="space-y-1">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button
          variant={type === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
