import { useCallback, useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';

export interface UseFormPersistenceOptions {
  /** Storage key. Use a per-form (and per-mode) key to avoid collisions. */
  key: string;
  /** Where to persist. Defaults to sessionStorage (survives reload, clears with the tab). */
  storage?: Storage;
  /** Values to reset to when clearing. Defaults to an empty object. */
  defaultValues?: Record<string, any>;
  /** Debounce for writes, in ms. Default 300. */
  debounceMs?: number;
}

const getStorage = (storage?: Storage): Storage | null => {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

/**
 * Persists a react-hook-form's values to Web Storage so the form survives a
 * page reload, and returns a `clear()` to wipe it. File inputs are not part of
 * react-hook-form state and are not persisted.
 */
export function useFormPersistence(
  methods: UseFormReturn<any>,
  { key, storage, defaultValues, debounceMs = 300 }: UseFormPersistenceOptions,
) {
  const store = getStorage(storage);
  const loaded = useRef(false);

  // Restore once on mount.
  useEffect(() => {
    if (loaded.current || !store) return;
    loaded.current = true;
    try {
      const raw = store.getItem(key);
      if (raw) methods.reset(JSON.parse(raw));
    } catch {
      /* ignore malformed/blocked storage */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persist on change (debounced).
  useEffect(() => {
    if (!store) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscription = methods.watch((values) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          store.setItem(key, JSON.stringify(values));
        } catch {
          /* ignore quota/blocked storage */
        }
      }, debounceMs);
    });
    return () => {
      if (timer) clearTimeout(timer);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, debounceMs]);

  const clear = useCallback(() => {
    try {
      store?.removeItem(key);
    } catch {
      /* ignore */
    }
    methods.reset((defaultValues ?? {}) as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { clear };
}
