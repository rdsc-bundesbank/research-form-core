import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type JSZip from 'jszip';

export interface ResolvedImport {
  /** The application object to load into the form. */
  application: Record<string, any>;
  /** Optional warning to surface (e.g. "created with an older version …"). */
  warning?: string | null;
}

export interface UseApplicationImportOptions {
  /** Values a fresh form starts from; the default resolver merges the import onto these. */
  defaultValues: Record<string, any>;
  /**
   * Turn the raw parsed application into the object to load, plus an optional
   * warning. Defaults to a shallow merge onto `defaultValues`. Use this to run a
   * schema check / migration (as the RDSC app does).
   */
  resolve?: (raw: unknown) => ResolvedImport;
  /**
   * Load side data that is NOT part of react-hook-form state but must be present
   * after reset — e.g. re-hydrated file attachments read from the ZIP. Whatever
   * it returns is merged into the object passed to `reset`.
   */
  loadExtras?: (zip: JSZip, application: Record<string, any>) => Promise<Record<string, any>> | Record<string, any>;
  /** Reset ancillary UI after a successful import (close modals, clear indexes, …). */
  onImported?: (application: Record<string, any>) => void;
  /** Run after every import attempt (e.g. re-validate the form). */
  afterImport?: () => void | Promise<void>;
}

export interface UseApplicationImportResult {
  importError: string | null;
  importWarning: string | null;
  setImportError: (message: string | null) => void;
  /** Handler for {@link ApplicationImport}'s `onImport`. */
  importApplication: (raw: unknown, zip: JSZip) => Promise<void>;
}

/**
 * Encapsulates the "import an existing application" flow shared by every app:
 * manage the error/warning banners, resolve/migrate the raw application, load
 * any file attachments, reset the form, reset ancillary UI, and re-validate.
 * Institution-specific behaviour is supplied via the option callbacks; the
 * default is a plain shallow-merge onto `defaultValues`.
 */
export function useApplicationImport(
  methods: UseFormReturn<any>,
  { defaultValues, resolve, loadExtras, onImported, afterImport }: UseApplicationImportOptions,
): UseApplicationImportResult {
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarning, setImportWarning] = useState<string | null>(null);

  const importApplication = async (raw: unknown, zip: JSZip) => {
    try {
      const resolved: ResolvedImport = resolve
        ? resolve(raw)
        : { application: { ...defaultValues, ...(raw as object) } };
      setImportWarning(resolved.warning ?? null);

      const extras = loadExtras ? await loadExtras(zip, resolved.application) : undefined;
      methods.reset(extras ? { ...resolved.application, ...extras } : resolved.application);

      onImported?.(resolved.application);
      setImportError(null);
    } catch (err: any) {
      setImportError(String(err?.message ?? err));
    } finally {
      await afterImport?.();
    }
  };

  return { importError, importWarning, setImportError, importApplication };
}
