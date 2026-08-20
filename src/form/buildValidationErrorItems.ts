import type { FieldErrors, FieldError } from 'react-hook-form';
import type { BlockingErrorMessage, ValidationErrorItem } from './validationTypes';

/**
 * Institution-specific labelling for the validation helper. All of it is
 * content: which field maps to which human label, which top-level field scrolls
 * to which section anchor, and which array fields are shown as indexed groups
 * ("Author 1 – …").
 */
export interface ValidationLabels {
  /** field name -> human label */
  fieldLabels?: Record<string, string>;
  /** top-level field name -> element id to scroll to */
  sectionTargets?: Record<string, string>;
  /** array field name -> singular prefix, e.g. { authors: 'Author' } */
  indexedGroups?: Record<string, string>;
  /** attachment id -> label, used under `attachmentsKey` */
  attachmentLabels?: Record<string, string>;
  /** the array field holding file attachments (special-cased), e.g. 'attachmentFiles' */
  attachmentsKey?: string;
  /** message used for any attachment error */
  missingFileMessage?: string;
}

const humanizePathPart = (pathPart: string): string =>
  pathPart.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const getFieldAnchorId = (path: string) => `field-${path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

/**
 * Builds a flat, wizard-friendly list of validation errors from blocking errors
 * and react-hook-form's nested field error tree. Institution labels are
 * supplied via `labels`; the traversal/formatting logic is generic.
 */
export const buildValidationErrorItems = (
  errors: FieldErrors<any>,
  blockingErrorMessages: BlockingErrorMessage[],
  labels: ValidationLabels = {},
): ValidationErrorItem[] => {
  const blockingItems: ValidationErrorItem[] = blockingErrorMessages.map(
    ({ card, idx, text }) => ({
      id: `blocking-${card}-${idx}`,
      message: text,
      targetId: 'blocking-error-anchor',
      severity: 'blocking' as const,
    }),
  );

  return [...blockingItems, ...flattenFieldErrors(errors, [], labels)];
};

const flattenFieldErrors = (
  value: unknown,
  pathParts: string[],
  labels: ValidationLabels,
): ValidationErrorItem[] => {
  if (!value || typeof value !== 'object') return [];

  const error = value as Partial<FieldError>;
  const message = typeof error.message === 'string' ? error.message : undefined;

  if (message) {
    const path = pathParts.join('.');
    return [
      {
        id: `field-${path || message}`,
        message: formatErrorMessage(pathParts, message, labels),
        path,
        targetId: getTargetId(pathParts, path, labels),
        severity: 'error',
      },
    ];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    if (key === 'ref' || key === 'type' || key === 'types') return [];
    return flattenFieldErrors(nestedValue, [...pathParts, key], labels);
  });
};

const formatErrorMessage = (
  pathParts: string[],
  message: string,
  labels: ValidationLabels,
): string => {
  const normalized =
    labels.attachmentsKey && pathParts[0] === labels.attachmentsKey
      ? labels.missingFileMessage ?? message
      : message;
  const label = formatPathLabel(pathParts, labels);
  return label ? `${label}: ${normalized}` : normalized;
};

const formatPathLabel = (pathParts: string[], labels: ValidationLabels): string => {
  if (pathParts.length === 0) return '';

  if (labels.attachmentsKey && pathParts[0] === labels.attachmentsKey) {
    const attachmentId = pathParts[1];
    if (!attachmentId || attachmentId === 'root') return 'Required documents';
    return labels.attachmentLabels?.[attachmentId] ?? attachmentId;
  }

  const groupPrefix = labels.indexedGroups?.[pathParts[0]];
  if (groupPrefix) return formatIndexedLabel(groupPrefix, pathParts, labels);

  const last = pathParts.at(-1) ?? '';
  return labels.fieldLabels?.[last] ?? humanizePathPart(last);
};

const formatIndexedLabel = (
  prefix: string,
  pathParts: string[],
  labels: ValidationLabels,
): string => {
  const index = Number(pathParts[1]);
  const fieldName = pathParts.at(-1) ?? '';
  const fieldLabel = labels.fieldLabels?.[fieldName] ?? humanizePathPart(fieldName);
  return Number.isInteger(index)
    ? `${prefix} ${index + 1} – ${fieldLabel}`
    : `${prefix} – ${fieldLabel}`;
};

const getTargetId = (
  pathParts: string[],
  path: string,
  labels: ValidationLabels,
): string | undefined => {
  const fieldAnchorId = getFieldAnchorId(path);
  if (typeof document !== 'undefined' && document.getElementById(fieldAnchorId)) {
    return fieldAnchorId;
  }
  const topLevelPath = pathParts[0];
  if (!topLevelPath) return undefined;
  return labels.sectionTargets?.[topLevelPath];
};
