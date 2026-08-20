/**
 * Generic validation-error shapes shared by the engine's validation UI
 * (ValidationSummary, StickyValidationBar, ErrorReviewWizard). The mapping of
 * concrete field names to sections/labels is application content and lives in
 * the consuming app.
 */

export type ValidationErrorSeverity = 'blocking' | 'error';

export interface BlockingErrorMessage {
    card: string;
    idx: number;
    text: string;
}

export interface ValidationErrorItem {
    id: string;
    message: string;
    path?: string;
    targetId?: string;
    severity: ValidationErrorSeverity;
}
