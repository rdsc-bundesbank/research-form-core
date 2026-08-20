import React, {useMemo, useState} from 'react';
import {Card, Form} from 'react-bootstrap';
import {useFormContext, useWatch, type Resolver} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import type {ZodTypeAny} from 'zod';
import {ModalListField} from '../form/modalListField';
import {DatasetDetailsModal, type DatasetExtraRenderer, type DatasetExtraValidator} from './datasetDetailsModal';
import {DatasetTable, type DatasetSelection} from './datasetTable';
import {LinkageGraphView} from '../graph/linkageGraphView';
import {
    datasetsForMode,
    resolveDatasetExtraFields,
    resolveFormOptions,
    type ContentPack,
} from '../content/contentPack';
import type {Dataset} from './datasetTypes';
import type {FieldDef} from '../form/flatFormSchema';

export interface AdditionalDataConfig<T extends Record<string, any>> {
    fields: FieldDef[];
    defaultItem: T;
    schema?: ZodTypeAny;
    resolver?: Resolver<any>;
    addLabel?: string;
    modalTitle?: React.ReactNode;
    emptyText?: React.ReactNode;
    heading?: React.ReactNode;
    enableFieldName?: string;
    enableLabel?: React.ReactNode;
    size?: 'sm' | 'lg' | 'xl';
    renderItem: (item: T, index: number) => React.ReactNode;
    mapForLinkage?: (item: T) => {source_name?: string; identifier_variables?: string[]};
}

export interface DatasetSectionProps<TAdditional extends Record<string, any> = Record<string, any>> {
    mode: string;
    contentPack: ContentPack;
    additionalDataConfig?: AdditionalDataConfig<TAdditional>;
    header?: React.ReactNode;
    intro?: React.ReactNode;
    disabled?: boolean;
    selectionName?: string;
    additionalDataName?: string;
    beforeAccessMatrix?: React.ReactNode;
    accessMatrix?: React.ReactNode;
    warnings?: React.ReactNode;
    afterDatasetTable?: React.ReactNode;
    datasetModalSize?: 'sm' | 'lg' | 'xl';
    datasetModalBackdrop?: 'static' | boolean;
    datasetModalTitle?: (dataset: Dataset) => React.ReactNode;
    datasetModalPartsHeader?: React.ReactNode;
    renderDatasetModalPartLabel?: (part: NonNullable<Dataset['parts']>[number]) => React.ReactNode;
    resolveDatasetExtraRenderer?: (dataset?: Dataset | null) => DatasetExtraRenderer | undefined;
    validateDatasetExtra?: DatasetExtraValidator;
}

/** Shared dataset selection section with app-supplied extension slots. */
export function DatasetSection<TAdditional extends Record<string, any> = Record<string, any>>({
    mode,
    contentPack,
    additionalDataConfig,
    header = 'Datasets',
    intro,
    disabled,
    selectionName = 'dataset_selection',
    additionalDataName = 'additional_data',
    beforeAccessMatrix,
    accessMatrix,
    warnings,
    afterDatasetTable,
    datasetModalSize,
    datasetModalBackdrop = 'static',
    datasetModalTitle,
    datasetModalPartsHeader,
    renderDatasetModalPartLabel,
    resolveDatasetExtraRenderer,
    validateDatasetExtra,
}: DatasetSectionProps<TAdditional>) {
    const {control, register, setValue, formState: {errors}} = useFormContext();
    const options = resolveFormOptions(contentPack.options);
    const datasets = useMemo(() => datasetsForMode(contentPack, mode), [contentPack, mode]);
    const selection: DatasetSelection[] = (useWatch({control, name: selectionName}) as DatasetSelection[]) ?? [];
    const additionalValues: TAdditional[] = (useWatch({control, name: additionalDataName}) as TAdditional[]) ?? [];
    const useAdditionalValue = useWatch({
        control,
        name: additionalDataConfig?.enableFieldName ?? '__additional_enabled__',
    });
    const useAdditional = additionalDataConfig?.enableFieldName ? useAdditionalValue : true;
    const [modalDataset, setModalDataset] = useState<Dataset | null>(null);

    const additionalForGraph = useMemo(
        () => additionalValues.map((item) =>
            additionalDataConfig?.mapForLinkage
                ? additionalDataConfig.mapForLinkage(item)
                : {
                      source_name: (item as any)?.source_name,
                      identifier_variables: (item as any)?.identifier_variables ?? [],
                  },
        ),
        [additionalDataConfig, additionalValues],
    );

    const setSelection = (next: DatasetSelection[]) =>
        setValue(selectionName as any, next as any, {shouldValidate: true, shouldDirty: true});

    const existingSelection = (dataset: Dataset | null) =>
        dataset ? selection.find((item) => item.dataset.abbreviation === dataset.abbreviation) : undefined;

    const onEditDatasetParts = (dataset: Dataset) => {
        const hasParts = options.allowDatasetParts && (dataset.parts?.length ?? 0) > 0;
        const hasExtraFields = resolveDatasetExtraFields(contentPack, dataset).length > 0;
        const existing = existingSelection(dataset);

        if (hasParts || hasExtraFields) {
            setModalDataset(dataset);
            return;
        }

        setSelection(
            existing
                ? selection.filter((item) => item.dataset.abbreviation !== dataset.abbreviation)
                : [...selection, {dataset, parts: [], options: {}}],
        );
    };

    const saveDatasetModal = ({parts, extra}: {parts: string[]; extra: Record<string, any>}) => {
        if (!modalDataset) return;

        const existing = existingSelection(modalDataset);
        const other = selection.filter((item) => item.dataset.abbreviation !== modalDataset.abbreviation);
        const hasParts = (modalDataset.parts?.length ?? 0) > 0;
        const keep = hasParts ? parts.length > 0 : true;
        const next = keep
            ? [...other, {
                  dataset: modalDataset,
                  parts,
                  options: existing?.options ?? {},
                  authorAccess: existing?.authorAccess,
                  extra,
              }]
            : other;
        const order = new Map(datasets.map((dataset, index) => [dataset.abbreviation, index] as const));

        setSelection(next.sort((a, b) =>
            (order.get(a.dataset.abbreviation) ?? 0) -
            (order.get(b.dataset.abbreviation) ?? 0),
        ));
        setModalDataset(null);
    };

    const fieldError = (errors as any)[selectionName];

    return (
        <>
            <Card className="mb-3">
                <Card.Header>{header}</Card.Header>
                <Card.Body>
                    {intro}
                    <Form.Group className="mb-3">
                        <DatasetTable
                            value={selection}
                            onChange={setSelection}
                            datasets={datasets}
                            identifierMetadata={contentPack.identifierMetadata}
                            maxSelected={options.maxDatasets}
                            categoryBadgeClasses={options.categoryBadgeClasses}
                            onEditDatasetParts={onEditDatasetParts}
                            mode={mode as any}
                        />
                        {fieldError?.message && (
                            <Form.Text
                                className="text-danger"
                                dangerouslySetInnerHTML={{__html: fieldError.message}}
                            />
                        )}
                    </Form.Group>

                    {afterDatasetTable}
                    {beforeAccessMatrix}
                    {accessMatrix}
                    {warnings}

                    {options.allowAdditionalData && additionalDataConfig && (
                        <div className="mt-4 pt-3 border-top">
                            {additionalDataConfig.heading ?? <h6>Additional (external) data</h6>}
                            {additionalDataConfig.enableFieldName && (
                                <Form.Check
                                    type="checkbox"
                                    className="mb-3"
                                    label={additionalDataConfig.enableLabel}
                                    disabled={disabled}
                                    {...register(additionalDataConfig.enableFieldName as any)}
                                />
                            )}
                            {useAdditional && (
                                <ModalListField<TAdditional>
                                    name={additionalDataName}
                                    addLabel={additionalDataConfig.addLabel}
                                    modalTitle={additionalDataConfig.modalTitle}
                                    fields={additionalDataConfig.fields}
                                    defaultItem={additionalDataConfig.defaultItem}
                                    resolver={additionalDataConfig.resolver ?? (
                                        additionalDataConfig.schema ? zodResolver(additionalDataConfig.schema) : undefined
                                    )}
                                    size={additionalDataConfig.size}
                                    emptyText={additionalDataConfig.emptyText}
                                    renderItem={additionalDataConfig.renderItem}
                                />
                            )}
                        </div>
                    )}
                </Card.Body>
            </Card>

            {options.allowLinkage && (
                <LinkageGraphView
                    datasetSelection={selection as (DatasetSelection & {dataset: Dataset})[]}
                    additionalData={additionalForGraph}
                    identifierMappings={contentPack.identifierLinkages}
                />
            )}

            <DatasetDetailsModal
                dataset={modalDataset}
                extraFields={resolveDatasetExtraFields(contentPack, modalDataset)}
                initialParts={existingSelection(modalDataset)?.parts ?? []}
                initialExtra={(existingSelection(modalDataset) as any)?.extra ?? {}}
                onSave={saveDatasetModal}
                onClose={() => setModalDataset(null)}
                extraRenderer={resolveDatasetExtraRenderer?.(modalDataset)}
                validateExtra={validateDatasetExtra}
                size={datasetModalSize}
                backdrop={datasetModalBackdrop}
                title={datasetModalTitle}
                partsHeader={datasetModalPartsHeader}
                renderPartLabel={renderDatasetModalPartLabel}
            />
        </>
    );
}
