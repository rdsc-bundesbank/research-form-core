import type React from 'react';

/** Describes the flat schema consumed by FlatFormRenderer. */
export type FieldType =
    | 'text'
    | 'textarea'
    | 'select'
    | 'checkbox'
    | 'radio'
    | 'date'
    | 'integer'
    | 'float';

export type OptionValue = boolean | string;

export type OptionDef = {
    label: React.ReactNode;
    value: OptionValue;
};

export type DynamicText = React.ReactNode | ((values: any) => React.ReactNode);

export type DynamicHtml = string | ((values: any) => string);

export type FieldDef = {
    name: string;
    type: FieldType;
    label?: DynamicText;
    checkboxLabel?: DynamicText;
    group?: string;
    row?: string | number;
    col?: number;
    placeholder?: string;
    /** Browser/UI-level minimum for numeric fields; enforce business rules in schemas. */
    min?: number;
    /** Browser/UI-level maximum for numeric fields; enforce business rules in schemas. */
    max?: number;
    /** Browser/UI-level regex pattern for textual fields; enforce business rules in schemas. */
    pattern?: string;
    helpText?: DynamicText;
    helpHtml?: DynamicHtml;
    before?: DynamicText;
    className?: string;
    errorClassName?: string;
    rows?: number;
    inline?: boolean;
    options?: OptionDef[];
    /** Allows select fields to create values that are not present in options. */
    allowCustomOptions?: boolean;
    props?: Record<string, any>;
    /** Optional visibility condition depending on other form values. */
    visibleWhen?: (values: any) => boolean;
    /** Optional max word count for textarea fields (purely UI-level hint). */
    maxWords?: number;
    /** When true, the field must be filled (respecting `visibleWhen`). */
    required?: boolean;
};

/** True when a field's value counts as "not provided". */
export const isEmptyFieldValue = (field: FieldDef, value: any): boolean => {
    if (field.type === 'checkbox') return value !== true;
    if (Array.isArray(value)) return value.length === 0;
    return value === undefined || value === null || String(value).trim() === '';
};

/**
 * Returns the fields that are `required`, currently visible and still empty —
 * used to validate dynamic field sets (e.g. a dataset's extraFields) that can't
 * be expressed as a static zod schema.
 */
export const missingRequiredFields = (
    fields: FieldDef[],
    values: Record<string, any>,
): FieldDef[] =>
    fields.filter(
        (field) =>
            field.required &&
            (!field.visibleWhen || field.visibleWhen(values)) &&
            isEmptyFieldValue(field, values?.[field.name]),
    );

/**
 * Returns a shallow copy of `obj` with every field whose `visibleWhen` predicate
 * is currently false removed. Those fields are hidden in the form, so their
 * (stale) values should not leak into an export. Fields without a `visibleWhen`
 * are always kept. `context` supplies the values the predicates read (defaults
 * to `obj` itself, but a nested object can pass its parent).
 */
export const stripHiddenFields = <T extends Record<string, any>>(
    obj: T,
    fields: FieldDef[],
    context: Record<string, any> = obj,
): T => {
    const result: Record<string, any> = { ...obj };
    for (const field of fields) {
        if (field.visibleWhen && !field.visibleWhen(context)) {
            delete result[field.name];
        }
    }
    return result as T;
};
