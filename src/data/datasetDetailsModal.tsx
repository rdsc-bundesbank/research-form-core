import React from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { useForm, FormProvider } from 'react-hook-form';
import { FlatFormRenderer } from '../form/flatFormRenderer';
import { missingRequiredFields, type FieldDef } from '../form/flatFormSchema';
import type { Dataset, DatasetPart } from './datasetTypes';

export interface DatasetExtraRendererProps {
    /** The dataset whose extra answers are being edited. */
    dataset: Dataset;
    /** Currently selected dataset part abbreviations. */
    selectedParts: string[];
}

/** Renders application-specific controls into a dataset's extra-answer form. */
export type DatasetExtraRenderer = React.ComponentType<DatasetExtraRendererProps>;

export interface DatasetExtraValidationIssue {
    /** Field path relative to the dataset `extra` object. */
    path: string | string[];
    message: string;
}

export interface DatasetExtraValidatorInput {
    dataset: Dataset;
    values: Record<string, any>;
    selectedParts: string[];
}

/** Validates application-specific dataset extra answers before the modal saves. */
export type DatasetExtraValidator = (
    input: DatasetExtraValidatorInput,
) => DatasetExtraValidationIssue[];

export interface DatasetDetailsModalProps {
    /** The dataset being edited (null = modal closed). */
    dataset: Dataset | null;
    /**
     * The complete extra-field list for this dataset — the pack's common fields
     * plus the dataset's own. Compute with `resolveDatasetExtraFields(pack, dataset)`.
     */
    extraFields: FieldDef[];
    initialParts: string[];
    initialExtra: Record<string, any>;
    onSave: (result: { parts: string[]; extra: Record<string, any> }) => void;
    onClose: () => void;
    /** Optional application-specific renderer for rich dataset extra controls. */
    extraRenderer?: DatasetExtraRenderer;
    /** Optional application-specific validation for rich dataset extra controls. */
    validateExtra?: DatasetExtraValidator;

    // --- Presentation (institution content); sensible defaults are provided. ---
    /** Modal size passed through to react-bootstrap's <Modal>. */
    size?: 'sm' | 'lg' | 'xl';
    /** Modal backdrop behaviour; e.g. "static" to block outside-click close. */
    backdrop?: 'static' | boolean;
    /** Dialog title for the dataset. Default: the dataset name. */
    title?: (dataset: Dataset) => React.ReactNode;
    /** Heading shown above the parts checkboxes. */
    partsHeader?: React.ReactNode;
    /** Label for a single part checkbox. */
    renderPartLabel?: (part: DatasetPart) => React.ReactNode;
    /** Alert shown when the user tries to save a multi-part dataset with no part. */
    noPartsSelectedMessage?: string;
}

const defaultTitle = (dataset: Dataset): React.ReactNode => dataset.name;

const defaultPartsHeader = (
    <p className="text-muted">Choose which parts of this dataset you need.</p>
);

const defaultRenderPartLabel = (part: DatasetPart): React.ReactNode => (
    <>
        <strong>{part.abbreviation}</strong>
        {part.description && <span className="text-muted"> — {part.description}</span>}
    </>
);

/** Converts a relative extra-answer issue path to a react-hook-form field name. */
const getExtraIssueName = (path: string | string[]) => {
    return Array.isArray(path) ? path.join('.') : path;
};

/**
 * A dataset "details" dialog: pick the parts of a multi-part dataset and/or
 * answer the dataset's extra questions (the pack's common fields plus the
 * dataset's own `extraFields`), rendered by the engine's FlatFormRenderer. The
 * extra answers get their own local form so that each field's `visibleWhen` can
 * reference its siblings by name. Selection bookkeeping stays in the parent via
 * `onSave`. Presentation (title, sizing, part labels) is supplied by the app.
 */
export const DatasetDetailsModal: React.FC<DatasetDetailsModalProps> = ({
    dataset,
    extraFields,
    initialParts,
    initialExtra,
    onSave,
    onClose,
    extraRenderer: ExtraRenderer,
    validateExtra,
    size,
    backdrop,
    title = defaultTitle,
    partsHeader = defaultPartsHeader,
    renderPartLabel = defaultRenderPartLabel,
    noPartsSelectedMessage = 'Select at least one part.',
}) => {
    const [selected, setSelected] = React.useState<string[]>(initialParts);
    const methods = useForm({ mode: 'onChange', defaultValues: initialExtra });

    const hasParts = (dataset?.parts?.length ?? 0) > 0;

    // Re-initialise only when a different dataset opens, so editing parts/answers
    // does not wipe what the user just typed.
    React.useEffect(() => {
        setSelected(initialParts);
        methods.reset(initialExtra);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataset?.abbreviation]);

    const togglePart = (abbr: string) =>
        setSelected((s) => (s.includes(abbr) ? s.filter((a) => a !== abbr) : [...s, abbr]));

    const handleSave = () => {
        if (!dataset) return;
        if (hasParts && selected.length === 0) {
            window.alert(noPartsSelectedMessage);
            return;
        }
        const values = methods.getValues() as Record<string, any>;

        // Surface inline errors before the parent form runs its full validation.
        methods.clearErrors();
        const missing = missingRequiredFields(extraFields, values);
        missing.forEach((field) =>
            methods.setError(field.name as any, {
                type: 'required',
                message: 'This field is required.',
            }),
        );

        const extraIssues = validateExtra?.({
            dataset,
            values,
            selectedParts: selected,
        }) ?? [];
        extraIssues.forEach((issue) =>
            methods.setError(getExtraIssueName(issue.path) as any, {
                type: 'validate',
                message: issue.message,
            }),
        );
        if (missing.length > 0 || extraIssues.length > 0) return;

        onSave({ parts: selected, extra: values });
    };

    return (
        <Modal show={!!dataset} onHide={onClose} size={size} backdrop={backdrop}>
            <Modal.Header closeButton>
                <Modal.Title>{dataset && title(dataset)}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {hasParts && (
                    <div className="mb-3">
                        {partsHeader}
                        {(dataset?.parts ?? []).map((part) => (
                            <Form.Check
                                key={part.abbreviation}
                                type="checkbox"
                                id={`part-${part.abbreviation}`}
                                className="mb-2"
                                checked={selected.includes(part.abbreviation)}
                                onChange={() => togglePart(part.abbreviation)}
                                label={renderPartLabel(part)}
                            />
                        ))}
                    </div>
                )}

                {(extraFields.length > 0 || (dataset && ExtraRenderer)) && (
                    <div className={hasParts ? 'mt-3 pt-3 border-top' : ''}>
                        <FormProvider {...methods}>
                            {extraFields.length > 0 && <FlatFormRenderer fields={extraFields} />}
                            {dataset && ExtraRenderer && (
                                <ExtraRenderer dataset={dataset} selectedParts={selected} />
                            )}
                        </FormProvider>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>
                    <i className="bi bi-x-lg me-1" />
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleSave}>
                    <i className="bi bi-check-lg me-1" />
                    Save selection
                </Button>
            </Modal.Footer>
        </Modal>
    );
};
