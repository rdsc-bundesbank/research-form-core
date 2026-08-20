import React from 'react';
import { Button } from 'react-bootstrap';
import { type ApplicationImportHandler } from './applicationImport';
import { confirmClearForm } from '../utils/confirmClearForm';

export interface FormActionButtonsProps {
  /** Import an existing application ZIP (via the file picker). */
  onImport?: ApplicationImportHandler;
  onImportError?: (message: string) => void;
  /**
   * Clears the persisted form (e.g. `useFormPersistence().clear`). When provided,
   * the button runs the shared confirm-then-clear flow itself — the consumer does
   * not write its own handler. Use `afterClear` for any app-specific side effect
   * (reset local upload state, reload the page, …).
   */
  clear?: () => void;
  afterClear?: () => void;
  clearConfirmMessage?: string;
  /** Escape hatch: a fully custom clear handler. Ignored when `clear` is given. */
  onClear?: () => void;
  clearLabel?: string;
  size?: 'sm' | 'lg';
  className?: string;
}

/**
 * A consistent top toolbar of application actions — currently "Clear form" —
 * shared by the app and the example so both look and behave the same. Pass
 * `clear` (from useFormPersistence) and the button owns the confirm dialog; the
 * matching import drag-and-drop zone is {@link ApplicationImport}.
 */
export const FormActionButtons: React.FC<FormActionButtonsProps> = ({
  clear,
  afterClear,
  clearConfirmMessage,
  onClear,
  clearLabel = 'Clear form',
  size = 'sm',
  className,
}) => {
  const handleClear = clear
    ? () => confirmClearForm({ clear, message: clearConfirmMessage, afterClear })
    : onClear;

  return (
    <div className={`d-flex align-items-center gap-2 ${className ?? ''}`}>
      {handleClear && (
        <Button variant="secondary" size={size} onClick={handleClear}>
          <i className="bi bi-arrow-counterclockwise me-1" />
          {clearLabel}
        </Button>
      )}
    </div>
  );
};
