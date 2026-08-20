import React, {useEffect} from 'react';
import {Card, Form} from 'react-bootstrap';
import {useFormContext, useWatch, type Resolver} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import type {ZodTypeAny} from 'zod';
import {ModalListField} from './modalListField';
import type {FieldDef} from './flatFormSchema';

export interface FundingSectionProps<T extends Record<string, any>> {
    fields: FieldDef[];
    defaultItem: T;
    schema?: ZodTypeAny;
    resolver?: Resolver<any>;
    header?: React.ReactNode;
    checkboxLabel?: React.ReactNode;
    checkboxName?: string;
    listName?: string;
    addLabel?: string;
    modalTitle?: React.ReactNode;
    emptyText?: React.ReactNode;
    disabled?: boolean;
    size?: 'sm' | 'lg' | 'xl';
    renderItem: (item: T, index: number) => React.ReactNode;
}

/** Project funding section backed by the shared modal-list editor. */
export function FundingSection<T extends Record<string, any>>({
    fields,
    defaultItem,
    schema,
    resolver,
    header = 'Project funding',
    checkboxLabel = 'This project is funded by one or more external organisations',
    checkboxName = 'has_external_funding',
    listName = 'funding_organisations',
    addLabel = 'Add funding organisation',
    modalTitle = 'Funding organisation',
    emptyText = 'No funding organisations added yet.',
    disabled,
    size,
    renderItem,
}: FundingSectionProps<T>) {
    const {control, register, trigger} = useFormContext();
    const hasFunding = useWatch({control, name: checkboxName});

    useEffect(() => {
        if (hasFunding === true) {
            void trigger([checkboxName, listName]);
        }
    }, [checkboxName, hasFunding, listName, trigger]);

    return (
        <Card className="mb-3">
            <Card.Header>{header}</Card.Header>
            <Card.Body>
                <Form.Check
                    type="checkbox"
                    id={checkboxName}
                    className="mb-3"
                    label={checkboxLabel}
                    disabled={disabled}
                    {...register(checkboxName as any)}
                />

                {hasFunding === true && (
                    <ModalListField<T>
                        name={listName}
                        addLabel={addLabel}
                        modalTitle={modalTitle}
                        fields={fields}
                        defaultItem={defaultItem}
                        resolver={resolver ?? (schema ? zodResolver(schema) : undefined)}
                        size={size}
                        emptyText={emptyText}
                        renderItem={renderItem}
                    />
                )}
            </Card.Body>
        </Card>
    );
}
