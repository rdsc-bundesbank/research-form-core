import { useCallback, useMemo, useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { buildValidationErrorItems, type ValidationLabels } from './buildValidationErrorItems';
import type { BlockingErrorMessage, ValidationErrorItem } from './validationTypes';

export interface UseValidationFlowOptions {
  /** react-hook-form trigger() — validates and resolves to whether the form is valid. */
  trigger: () => Promise<boolean>;
  /** react-hook-form formState.errors. */
  errors: FieldErrors<any>;
  /** react-hook-form formState.isValid. */
  isValid: boolean;
  blockingErrorMessages?: BlockingErrorMessage[];
  labels?: ValidationLabels;
  /** Produces the downloadable application (e.g. builds & downloads a ZIP). */
  onDownload: () => void | Promise<void>;
  /**
   * Optional final-submission action. When omitted, the bar shows only Validate
   * and Download (no Finalize button) — the common case.
   */
  onFinalize?: () => void;
  finalizeDisabledTooltip?: string;
  /** Require a download before finalising (default true). */
  requireDownloadBeforeFinalize?: boolean;
}

/**
 * Encapsulates the validate → review-errors (wizard) → download → finalize flow
 * and returns the exact props for {@link StickyValidationBar}. Lets an
 * application wire the whole validation helper in a couple of lines.
 */
export function useValidationFlow(options: UseValidationFlowOptions) {
  const {
    trigger,
    errors,
    isValid,
    blockingErrorMessages = [],
    labels,
    onDownload,
    onFinalize,
    finalizeDisabledTooltip = 'Validate and download the application before finalising.',
    requireDownloadBeforeFinalize = true,
  } = options;

  const [hasCheckedValidity, setHasCheckedValidity] = useState(false);
  const [lastValidityCheckResult, setLastValidityCheckResult] = useState<boolean | null>(null);
  const [currentErrorIndex, setCurrentErrorIndex] = useState(0);
  const [isErrorWizardOpen, setIsErrorWizardOpen] = useState(false);
  const [hasDownloadedApplication, setHasDownloadedApplication] = useState(false);

  const errorItems: ValidationErrorItem[] = useMemo(
    () => buildValidationErrorItems(errors, blockingErrorMessages, labels),
    [errors, blockingErrorMessages, labels],
  );

  const scrollToItem = useCallback((item?: ValidationErrorItem) => {
    if (!item?.targetId || typeof document === 'undefined') return;
    document.getElementById(item.targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const gotoIndex = useCallback(
    (index: number, items: ValidationErrorItem[]) => {
      if (items.length === 0) {
        setCurrentErrorIndex(0);
        return;
      }
      const bounded = Math.max(0, Math.min(index, items.length - 1));
      setCurrentErrorIndex(bounded);
      scrollToItem(items[bounded]);
    },
    [scrollToItem],
  );

  const onValidate = useCallback(async () => {
    const ok = await trigger();
    setHasCheckedValidity(true);
    setLastValidityCheckResult(ok);
    setIsErrorWizardOpen(!ok);
    // errors update reactively after trigger; open at the top of the list.
    setCurrentErrorIndex(0);
  }, [trigger]);

  const onReviewErrors = useCallback(async () => {
    if (!hasCheckedValidity) await onValidate();
    setIsErrorWizardOpen(true);
    gotoIndex(0, errorItems);
  }, [errorItems, gotoIndex, hasCheckedValidity, onValidate]);

  const onPreviousError = useCallback(
    () => gotoIndex(currentErrorIndex - 1, errorItems),
    [currentErrorIndex, errorItems, gotoIndex],
  );
  const onNextError = useCallback(
    () => gotoIndex(currentErrorIndex + 1, errorItems),
    [currentErrorIndex, errorItems, gotoIndex],
  );
  const onCloseErrorWizard = useCallback(() => setIsErrorWizardOpen(false), []);

  const onDownloadApplication = useCallback(async () => {
    await onDownload();
    setHasDownloadedApplication(true);
  }, [onDownload]);

  const isFinalizeDisabled =
    !isValid || (requireDownloadBeforeFinalize && !hasDownloadedApplication);

  return {
    errors: errorItems,
    currentErrorIndex,
    finalizeDisabledTooltip,
    hasCheckedValidity,
    hasDownloadedApplication,
    isErrorWizardOpen,
    isFinalizeDisabled,
    isValid,
    lastValidityCheckResult,
    onCloseErrorWizard,
    onDownloadApplication,
    onFinalizeSubmission: onFinalize,
    onNextError,
    onPreviousError,
    onReviewErrors,
    onValidate,
  };
}
