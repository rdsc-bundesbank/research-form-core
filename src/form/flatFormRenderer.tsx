import React from 'react';

import {Col, Form, Row} from 'react-bootstrap';
import {Controller, useFormContext, useWatch} from 'react-hook-form';
import Select, {components} from 'react-select';
import CreatableSelect from 'react-select/creatable';
import type {DynamicHtml, DynamicText, FieldDef, OptionDef, OptionValue} from './flatFormSchema';

const DEFAULT_GROUP_KEY = '__default__';
const ALWAYS_ENABLED_FIELDS = ['data_access_reason', 'intend_to_publish'];
const customOptionStyles = {
    multiValue: (base: any, props: any) => ({
        ...base,
        ...(props.data.isCustom
            ? {
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffda6a',
              }
            : {}),
    }),
    multiValueLabel: (base: any, props: any) => ({
        ...base,
        ...(props.data.isCustom
            ? {
                  color: '#664d03',
                  fontWeight: 600,
              }
            : {}),
    }),
    singleValue: (base: any, props: any) => ({
        ...base,
        ...(props.data.isCustom
            ? {
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffda6a',
                  borderRadius: '0.25rem',
                  color: '#664d03',
                  fontWeight: 600,
                  padding: '0 0.25rem',
              }
            : {}),
    }),
};

/** Builds a stable in-page anchor id for a form field name. */
const getFieldAnchorId = (name: string) => {
    return `field-${name.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
};

/** Resolves text or JSX that may depend on current form values. */
const resolveDynamicText = (text: DynamicText | undefined, values: any) => {
    return typeof text === 'function' ? text(values) : text;
};

/** Resolves HTML snippets that may depend on current form values. */
const resolveDynamicHtml = (html: DynamicHtml | undefined, values: any) => {
    return typeof html === 'function' ? html(values) : html;
};

/** Renders the validation error message for a react-hook-form field path. */
const FieldErrorText: React.FC<{className?: string; name: string}> = ({className, name}) => {
    const {
        formState: {errors},
    } = useFormContext();
    const errObj = name
        .split('.')
        .reduce((acc: any, key) => (acc ? acc[key] : undefined), errors as any);

    if (!errObj?.message) {
        return null;
    }

    return (
        <Form.Text className={className ?? 'text-danger d-block'}>
            {String(errObj.message)}
        </Form.Text>
    );
};

/** Renders a field help text, supporting either React nodes or trusted HTML snippets. */
const HelpText: React.FC<{html?: string; text?: React.ReactNode}> = ({html, text}) => {
    if (html) {
        return (
            <Form.Text
                className="text-muted d-block"
                dangerouslySetInnerHTML={{__html: html}}
            />
        );
    }

    if (!text) {
        return null;
    }

    return <Form.Text className="text-muted d-block">{text}</Form.Text>;
};

type SelectOption = OptionDef & {
    isCustom?: boolean;
};

const isSelectedValue = (selectedValue: unknown, optionValue: OptionValue) => {
    return Array.isArray(selectedValue) && selectedValue.includes(optionValue);
};

const buildCustomOption = (value: OptionValue): SelectOption => ({
    label: String(value),
    value,
    isCustom: true,
});

/** Builds react-select options, including selected custom entries when enabled. */
const buildSelectOptions = (field: FieldDef, selectedValue: unknown): SelectOption[] => {
    const baseOptions = field.options ?? [];

    if (!field.allowCustomOptions) {
        return baseOptions;
    }

    const knownValues = new Set(baseOptions.map((option) => option.value));
    if (Array.isArray(selectedValue)) {
        const customOptions = selectedValue
            .filter((value): value is OptionValue => !knownValues.has(value))
            .map(buildCustomOption);

    return [...baseOptions, ...customOptions];
    }

    if (
        (typeof selectedValue === 'string' || typeof selectedValue === 'boolean') &&
        !knownValues.has(selectedValue)
    ) {
        return [...baseOptions, buildCustomOption(selectedValue)];
    }

    return baseOptions;
};

/** Renders selected custom options with a distinct badge label. */
const MultiValueLabel = (props: any) => {
    if (!props.data.isCustom) {
        return <components.MultiValueLabel {...props} />;
    }

    return (
        <components.MultiValueLabel {...props}>
            Added: {props.children}
        </components.MultiValueLabel>
    );
};

/** Renders selected custom single options with a distinct badge label. */
const SingleValue = (props: any) => {
    if (!props.data.isCustom) {
        return <components.SingleValue {...props} />;
    }

    return <components.SingleValue {...props}>Added: {props.children}</components.SingleValue>;
};

/** Returns whether a field should be rendered for the current form values. */
const isFieldVisible = (field: FieldDef, values: any) => {
    return field.visibleWhen ? field.visibleWhen(values) : true;
};

/** Converts browser number input strings to numbers without making empty fields look filled. */
const parseNumberInput = (value: unknown) => {
    if (value === '') {
        return undefined;
    }

    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? value : numberValue;
};

/** Renders one field from the flat form schema. */
const SingleField: React.FC<{disabled?: boolean; field: FieldDef}> = ({field, disabled}) => {
    const {control, register, watch} = useFormContext();
    const values = useWatch({control});
    const helpText = resolveDynamicText(field.helpText, values);
    const helpHtml = resolveDynamicHtml(field.helpHtml, values);
    const label = resolveDynamicText(field.label, values);
    const checkboxLabel = resolveDynamicText(field.checkboxLabel, values) ?? label;
    const before = resolveDynamicText(field.before, values);
    const labelNode = label ? (
        <Form.Label>
            {label}
            {field.required && <span className="text-danger ms-1" aria-hidden="true">*</span>}
        </Form.Label>
    ) : null;

    if (!isFieldVisible(field, values)) {
        return null;
    }

    const effectiveDisabled = Boolean(disabled && !ALWAYS_ENABLED_FIELDS.includes(field.name));
    const groupClassName = field.className ?? 'mb-3';
    const errorClassName = field.errorClassName;

    switch (field.type) {
        case 'text':
        case 'date':
        case 'integer':
        case 'float': {
            const isNumberField = field.type === 'integer' || field.type === 'float';
            const controlType = isNumberField
                ? 'number'
                : field.type === 'date'
                  ? 'date'
                  : 'text';
            const registerOptions = isNumberField ? {setValueAs: parseNumberInput} : undefined;

            return (
                <Form.Group className={groupClassName} id={getFieldAnchorId(field.name)}>
                    {labelNode}
                    {before}
                    <Form.Control
                        type={controlType}
                        step={field.type === 'integer' ? 1 : field.type === 'float' ? 'any' : undefined}
                        min={field.min}
                        max={field.max}
                        pattern={field.pattern}
                        placeholder={field.placeholder}
                        disabled={effectiveDisabled}
                        {...register(field.name as any, registerOptions)}
                        {...field.props}
                    />
                    <HelpText html={helpHtml} text={helpText}/>
                    <FieldErrorText className={errorClassName} name={field.name}/>
                </Form.Group>
            );
        }
        case 'textarea': {
            const value = watch(field.name as any) ?? '';
            const wordCount = String(value)
                .trim()
                .split(/\s+/)
                .filter(Boolean).length;
            const overLimit = typeof field.maxWords === 'number' && wordCount > field.maxWords;

            return (
                <Form.Group className={groupClassName} id={getFieldAnchorId(field.name)}>
                    {labelNode}
                    {before}
                    <Form.Control
                        as="textarea"
                        rows={field.rows ?? 3}
                        placeholder={field.placeholder}
                        disabled={effectiveDisabled}
                        {...register(field.name as any)}
                        {...field.props}
                    />
                    <div>
                        <Form.Text muted>Word count: {wordCount}</Form.Text>
                        {overLimit && (
                            <Form.Text className="text-danger ms-2">
                                Please keep this justification short (max. ~{field.maxWords} words).
                            </Form.Text>
                        )}
                    </div>
                    <HelpText html={helpHtml} text={helpText}/>
                    <FieldErrorText className={errorClassName} name={field.name}/>
                </Form.Group>
            );
        }
        case 'select':
            return (
                <Form.Group className={groupClassName} id={getFieldAnchorId(field.name)}>
                    {labelNode}
                    {before}
                    <Controller
                        name={field.name as any}
                        control={control}
                        render={({field: rhfField}) => {
                            const isMulti = Boolean(field.props?.isMulti);
                            const selectedValue = rhfField.value;
                            const selectOptions = buildSelectOptions(field, selectedValue);
                            const selectValue = isMulti
                                ? selectOptions.filter((option) =>
                                      isSelectedValue(selectedValue, option.value),
                                  )
                                : selectOptions.find((option) => option.value === selectedValue) ?? null;
                            const SelectComponent = field.allowCustomOptions
                                ? CreatableSelect
                                : Select;
                            const selectComponents = field.allowCustomOptions
                                ? {
                                      MultiValueLabel,
                                      SingleValue,
                                      ...field.props?.components,
                                  }
                                : field.props?.components;

                            return (
                                <SelectComponent
                                    {...field.props}
                                    isDisabled={effectiveDisabled}
                                    value={selectValue}
                                    onChange={(option: any) => {
                                        if (isMulti) {
                                            const selectedOptions = Array.isArray(option) ? option : [];
                                            rhfField.onChange(
                                                selectedOptions.map((item) =>
                                                    item.value,
                                                ),
                                            );
                                            return;
                                        }

                                        rhfField.onChange(option?.value ?? '');
                                    }}
                                    options={selectOptions}
                                    getOptionLabel={(option: SelectOption) => String(option.label)}
                                    getOptionValue={(option: SelectOption) => String(option.value)}
                                    formatCreateLabel={(inputValue) => `Add “${inputValue}”`}
                                    isValidNewOption={(inputValue, _selectValue, options) => {
                                        const trimmedInput = inputValue.trim();
                                        return (
                                            field.allowCustomOptions === true &&
                                            trimmedInput.length > 0 &&
                                            !options.some(
                                                (option) =>
                                                    String((option as SelectOption).value) ===
                                                    trimmedInput,
                                            )
                                        );
                                    }}
                                    styles={
                                        field.allowCustomOptions
                                            ? {
                                                  ...field.props?.styles,
                                                  multiValue: customOptionStyles.multiValue,
                                                  multiValueLabel: customOptionStyles.multiValueLabel,
                                                  singleValue: customOptionStyles.singleValue,
                                              }
                                            : field.props?.styles
                                    }
                                    components={selectComponents}
                                    isClearable
                                    isMulti={isMulti}
                                />
                            );
                        }}
                    />
                    <HelpText html={helpHtml} text={helpText}/>
                    <FieldErrorText className={errorClassName} name={field.name}/>
                </Form.Group>
            );
        case 'checkbox':
            return (
                <Form.Group className={groupClassName} id={getFieldAnchorId(field.name)}>
                    {before}
                    <Form.Check
                        type="checkbox"
                        label={checkboxLabel}
                        disabled={effectiveDisabled}
                        {...register(field.name as any)}
                        {...field.props}
                    />
                    <HelpText html={helpHtml} text={helpText}/>
                    <FieldErrorText className={errorClassName} name={field.name}/>
                </Form.Group>
            );
        case 'radio':
            return (
                <Form.Group className={groupClassName} id={getFieldAnchorId(field.name)}>
                    {labelNode}
                    {before}
                    <Controller
                        name={field.name as any}
                        control={control}
                        render={({field: rhfField}) => (
                            <div>
                                {field.options?.map((option) => (
                                    <Form.Check
                                        key={String(option.value)}
                                        inline={field.inline}
                                        type="radio"
                                        label={option.label}
                                        value={String(option.value)}
                                        checked={rhfField.value === option.value}
                                        onChange={() => rhfField.onChange(option.value)}
                                        disabled={effectiveDisabled}
                                    />
                                ))}
                                <HelpText html={helpHtml} text={helpText}/>
                            </div>
                        )}
                    />
                    <FieldErrorText className={errorClassName} name={field.name}/>
                </Form.Group>
            );
        default:
            return null;
    }
};

/** Renders a flat list of field definitions grouped into Bootstrap rows and columns. */
export const FlatFormRenderer: React.FC<{disabled?: boolean; fields: FieldDef[]}> = ({
    disabled = false,
    fields,
}) => {
    const {control} = useFormContext();
    const values = useWatch({control});
    const groupsMap = new Map<string, FieldDef[]>();

    fields.filter((field) => isFieldVisible(field, values)).forEach((field) => {
        const groupKey = field.group ?? DEFAULT_GROUP_KEY;
        if (!groupsMap.has(groupKey)) {
            groupsMap.set(groupKey, []);
        }
        groupsMap.get(groupKey)?.push(field);
    });

    const groupEntries = Array.from(groupsMap.entries());

    return (
        <>
            {groupEntries.map(([groupKey, groupFields]) => {
                const rowsMap = new Map<string, FieldDef[]>();

                groupFields.forEach((field) => {
                    const rowKey =
                        field.row === undefined ? `__single__${field.name}` : String(field.row);
                    if (!rowsMap.has(rowKey)) {
                        rowsMap.set(rowKey, []);
                    }
                    rowsMap.get(rowKey)?.push(field);
                });

                const rows = Array.from(rowsMap.entries());

                return (
                    <div key={groupKey} className="mb-4">
                        {groupKey !== DEFAULT_GROUP_KEY && <h5 className="mb-3">{groupKey}</h5>}
                        {rows.map(([rowKey, rowFields]) => (
                            <Row key={rowKey}>
                                {rowFields.map((rowField) => (
                                    <Col key={rowField.name} md={rowField.col ?? 12}>
                                        <SingleField field={rowField} disabled={disabled}/>
                                    </Col>
                                ))}
                            </Row>
                        ))}
                    </div>
                );
            })}
        </>
    );
};
