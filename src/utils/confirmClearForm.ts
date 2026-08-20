/**
 * Shared "clear the whole form" helper. Both applications wire the same
 * confirm-then-clear flow: they differ only in what happens afterwards (the
 * example resets its local upload state; the app reloads the page), which is
 * passed as `afterClear`.
 */
export interface ConfirmClearFormOptions {
  /** Clears the persisted form (e.g. `useFormPersistence().clear`). */
  clear: () => void;
  /** Confirmation prompt. Defaults to a generic message. */
  message?: string;
  /** Optional side effect run after clearing (reset uploads, reload, …). */
  afterClear?: () => void;
}

const DEFAULT_MESSAGE = 'Clear the whole form? This cannot be undone.';

/** Confirms with the user, then clears the form and runs any `afterClear`. */
export function confirmClearForm({ clear, message, afterClear }: ConfirmClearFormOptions): void {
  if (typeof window !== 'undefined' && !window.confirm(message ?? DEFAULT_MESSAGE)) return;
  clear();
  afterClear?.();
}
