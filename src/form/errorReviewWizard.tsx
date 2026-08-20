import React from 'react';
import {Button, Card} from 'react-bootstrap';
import {ValidationErrorItem} from './validationTypes';

interface ErrorReviewWizardProps {
    errors: ValidationErrorItem[];
    currentIndex: number;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onValidate: () => void | Promise<void>;
}

/**
 * ErrorReviewWizard displays one validation issue at a time and lets users step
 * through all known form problems from the sticky validation footer.
 */
export const ErrorReviewWizard: React.FC<ErrorReviewWizardProps> = ({
    errors,
    currentIndex,
    onClose,
    onNext,
    onPrevious,
    onValidate,
}) => {
    const currentError = errors[currentIndex];
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === errors.length - 1;
    const hasMultipleErrors = errors.length > 1;

    if (!currentError) {
        return null;
    }

    return (
        <Card className="error-wizard shadow-sm" data-testid="error-review-wizard">
            <Card.Body className="py-3">
                <div className="d-flex justify-content-between gap-3">
                    <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <span
                                className={
                                    currentError.severity === 'blocking'
                                        ? 'badge text-bg-danger'
                                        : 'badge text-bg-warning'
                                }
                            >
                                {currentError.severity === 'blocking'
                                    ? 'Blocking issue'
                                    : 'Validation error'}
                            </span>
                            <span className="text-muted small">
                                Error {currentIndex + 1} of {errors.length}
                            </span>
                            {hasMultipleErrors && (
                                <div
                                    className="btn-group btn-group-sm"
                                    role="group"
                                    aria-label="Navigate validation errors"
                                >
                                    <Button
                                        type="button"
                                        variant="link"
                                        size="sm"
                                        disabled={isFirst}
                                        onClick={onPrevious}
                                    >
                                        <i className="bi bi-arrow-up" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="link"
                                        size="sm"
                                        disabled={isLast}
                                        onClick={onNext}
                                    >
                                        <i className="bi bi-arrow-down" />
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="d-flex justify-content-between align-items-center gap-3">
                            <div className="fw-semibold flex-grow-1">{currentError.message}</div>
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                className="flex-shrink-0 text-nowrap"
                                onClick={onValidate}
                            >
                                <i className="bi bi-arrow-repeat me-1" />
                                Validate again
                            </Button>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="link"
                        className="p-0 align-self-start text-muted"
                        aria-label="Close error review"
                        onClick={onClose}
                    >
                        <i className="bi bi-x-lg" />
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};
