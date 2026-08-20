import React from 'react';
import {Button, OverlayTrigger, Tooltip} from 'react-bootstrap';
import {ErrorReviewWizard} from './errorReviewWizard';
import {ValidationErrorItem} from './validationTypes';

interface StickyValidationBarProps {
    errors: ValidationErrorItem[];
    currentErrorIndex: number;
    hasCheckedValidity: boolean;
    isErrorWizardOpen: boolean;
    isValid: boolean;
    lastValidityCheckResult: boolean | null;
    onCloseErrorWizard: () => void;
    onDownloadApplication: () => void | Promise<void>;
    onNextError: () => void;
    onPreviousError: () => void;
    onReviewErrors: () => void | Promise<void>;
    onValidate: () => void | Promise<void>;
    /**
     * Optional final-submission action. Only when provided is a "Finalize" button
     * shown — the bar otherwise offers just Validate and Download. Keeps
     * app-specific submission flows (e.g. mailto) out of the core.
     */
    onFinalizeSubmission?: () => void;
    finalizeLabel?: string;
    isFinalizeDisabled?: boolean;
    finalizeDisabledTooltip?: string;
}

/**
 * StickyValidationBar keeps validation status, error review controls, and final
 * submission actions visible while users work through the application form.
 */
export const StickyValidationBar: React.FC<StickyValidationBarProps> = ({
    errors,
    currentErrorIndex,
    finalizeDisabledTooltip,
    hasCheckedValidity,
    isErrorWizardOpen,
    isFinalizeDisabled,
    isValid,
    lastValidityCheckResult,
    onCloseErrorWizard,
    onDownloadApplication,
    onFinalizeSubmission,
    onNextError,
    onPreviousError,
    onReviewErrors,
    onValidate,
    finalizeLabel = 'Finalize submission',
}) => {
    const errorCount = errors.length;

    return (
        <div className="sticky-footer">
            <div className="container px-0">
                {isErrorWizardOpen && errorCount > 0 && (
                    <ErrorReviewWizard
                        errors={errors}
                        currentIndex={currentErrorIndex}
                        onClose={onCloseErrorWizard}
                        onNext={onNextError}
                        onPrevious={onPreviousError}
                        onValidate={onValidate}
                    />
                )}

                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        {hasCheckedValidity && errorCount === 0 || hasCheckedValidity && lastValidityCheckResult === true && isValid ? (
                            <span className="text-success d-inline-flex align-items-center gap-1">
                                <i className="bi bi-check-circle-fill" />
                                <span>The form is valid.</span>
                            </span>
                        ) : hasCheckedValidity ? (
                            <>
                                <span className="text-danger d-inline-flex align-items-center gap-1">
                                    <i className="bi bi-x-circle-fill" />
                                    <span>
                                        The form contains {errorCount} validation{' '}
                                        {errorCount === 1 ? 'error.' : 'errors.'}
                                    </span>
                                </span>
                            </>
                        ) : (
                            <span className="text-muted d-inline-flex align-items-center gap-1">
                                <i className="bi bi-info-circle-fill" />
                                <span>Validate the form before final submission.</span>
                            </span>
                        )}


                    </div>

                    <div className="d-flex flex-wrap justify-content-end gap-2">
                        <Button type="button" variant="primary" onClick={onValidate}>
                            <i className="bi bi-check2-circle me-1" />
                            Validate Application
                        </Button>


                        <Button
                            type="button"
                            variant="primary"
                            onClick={onDownloadApplication}
                        >
                            <i className="bi bi-download me-1" />
                            Download Application
                        </Button>


                        {onFinalizeSubmission && (
                            <OverlayTrigger
                                placement="top"
                                overlay={
                                    isFinalizeDisabled ? (
                                        <Tooltip id="finalize-disabled-tooltip">
                                            {finalizeDisabledTooltip}
                                        </Tooltip>
                                    ) : <></>
                                }
                            >
                                <span>
                                    <Button
                                        type="button"
                                        variant="primary"
                                        disabled={isFinalizeDisabled}
                                        onClick={onFinalizeSubmission}
                                    >
                                        {finalizeLabel}
                                    </Button>
                                </span>
                            </OverlayTrigger>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
