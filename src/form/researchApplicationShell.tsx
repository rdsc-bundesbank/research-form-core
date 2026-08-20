import React from 'react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Alert, Container, Form} from 'react-bootstrap';
import {
    FormProvider,
    useForm,
    type FieldErrors,
    type UseFormReturn,
} from 'react-hook-form';
import type {ZodTypeAny} from 'zod';
import type {ContentPack} from '../content/contentPack';
import {resolveFormOptions} from '../content/contentPack';
import {buildApplicationZip, downloadBlob} from '../utils/applicationArchive';
import {BlockingGate} from './blockingGate';
import type {BlockingErrorEntry} from '../hooks/useBlockingErrors';
import {ApplicationImport} from './applicationImport';
import {
    archiveDocumentsFromUploads,
    documentLabelMap,
    formDocumentFilesFromZip,
    missingDocumentIds as getMissingDocumentIds,
    useFormDocumentUploads,
    type UploadValue,
} from './documentUploads';
import {FormActionButtons} from './formActionButtons';
import {
    RequiredDocumentsSection,
    type RequiredDocumentGroup,
} from './requiredDocumentsSection';
import {StickyValidationBar} from './stickyValidationBar';
import {useApplicationImport, type ResolvedImport} from './useApplicationImport';
import {useFormPersistence} from './useFormPersistence';
import {useValidationFlow} from './useValidationFlow';
import type {DocumentSpec} from './documentUploadCard';
import type {ValidationLabels} from './buildValidationErrorItems';

export interface ResearchApplicationShellSections<TValues extends Record<string, any>> {
    dataAccess: (context: ResearchApplicationShellRenderContext<TValues>) => React.ReactNode;
    project: (context: ResearchApplicationShellRenderContext<TValues>) => React.ReactNode;
    authors: (context: ResearchApplicationShellRenderContext<TValues>) => React.ReactNode;
    funding?: (context: ResearchApplicationShellRenderContext<TValues>) => React.ReactNode;
    datasets: (context: ResearchApplicationShellRenderContext<TValues>) => React.ReactNode;
    afterDatasets?: (context: ResearchApplicationShellRenderContext<TValues>) => React.ReactNode;
}

export interface ResearchApplicationShellRenderContext<TValues extends Record<string, any>> {
    mode: string;
    methods: UseFormReturn<TValues>;
    values: TValues;
    hasBlockingError: boolean;
    blockingErrorMessages: BlockingErrorEntry[];
}

export interface ResearchApplicationShellProps<TValues extends Record<string, any>, TDocument extends DocumentSpec = DocumentSpec> {
    mode: string;
    contentPack: ContentPack;
    schema: ZodTypeAny;
    defaultValues: TValues;
    persistenceKey: string;
    validationLabels: ValidationLabels;
    sectionIds: {
        dataAccess: string;
        project: string;
        authors: string;
        funding: string;
        datasets: string;
        requiredDocuments: string;
    };
    sections: ResearchApplicationShellSections<TValues>;
    deriveDocuments: (values: TValues) => TDocument[];
    blockingErrorMessages?: (context: {
        values: TValues;
        methods: UseFormReturn<TValues>;
        mode: string;
        }) => BlockingErrorEntry[];
    documentFieldName?: string;
    documentGroups?: (documents: TDocument[]) => RequiredDocumentGroup<TDocument>[];
    documentHeader?: React.ReactNode;
    sanitizeForExport?: (values: TValues) => TValues;
    resolveImport?: (raw: unknown) => ResolvedImport;
    afterImport?: () => void | Promise<void>;
    setFrontendValidityField?: keyof TValues & string;
    downloadFilename?: string;
    invalidDownloadConfirmation?: string;
    renderIntro?: React.ReactNode;
    renderImportWarning?: (warning: string) => React.ReactNode;
    renderImportError?: (error: string, clear: () => void) => React.ReactNode;
    afterClear?: () => void;
    finalize?: (values: TValues, methods: UseFormReturn<TValues>) => void;
    finalizeDisabledTooltip?: (isValid: boolean, hasBlockingError: boolean) => string;
    requireDownloadBeforeFinalize?: boolean;
}

export function ResearchApplicationShell<TValues extends Record<string, any>, TDocument extends DocumentSpec = DocumentSpec>({
    mode,
    contentPack,
    schema,
    defaultValues,
    persistenceKey,
    validationLabels,
    sectionIds,
    sections,
    deriveDocuments,
    blockingErrorMessages,
    documentFieldName = 'attachmentFiles',
    documentGroups,
    documentHeader,
    sanitizeForExport,
    resolveImport,
    afterImport,
    setFrontendValidityField,
    downloadFilename = 'research-application.zip',
    invalidDownloadConfirmation = 'The form contains validation errors. Do you still want to download the current application data?',
    renderIntro,
    renderImportWarning,
    renderImportError,
    afterClear,
    finalize,
    finalizeDisabledTooltip,
    requireDownloadBeforeFinalize,
}: ResearchApplicationShellProps<TValues, TDocument>) {
    const methods = useForm<TValues>({
        defaultValues: defaultValues as any,
        resolver: zodResolver(schema),
        mode: 'onChange',
        reValidateMode: 'onChange',
    });
    const values = methods.watch() as TValues;
    const options = resolveFormOptions(contentPack.options);
    const {clear} = useFormPersistence(methods, {key: persistenceKey, defaultValues});
    const {uploads, setFile} = useFormDocumentUploads(methods, documentFieldName);

    const documents = React.useMemo(() => deriveDocuments(values), [deriveDocuments, values]);
    const blockingMessages = React.useMemo(
        () => blockingErrorMessages?.({values, methods, mode}) ?? [],
        [blockingErrorMessages, methods, mode, values],
    );
    const hasBlockingError = blockingMessages.length > 0;

    const labels = React.useMemo(
        () => ({
            ...validationLabels,
            attachmentsKey: validationLabels.attachmentsKey ?? documentFieldName,
            attachmentLabels: documentLabelMap(documents),
        }),
        [documentFieldName, documents, validationLabels],
    );

    const runValidation = React.useCallback(async () => {
        const ok = await methods.trigger();
        const applicationIsValid = ok && blockingMessages.length === 0;
        if (setFrontendValidityField) {
            methods.setValue(setFrontendValidityField as any, applicationIsValid as any, {
                shouldDirty: true,
                shouldTouch: false,
                shouldValidate: false,
            });
        }
        if (!applicationIsValid) {
            console.error(methods.formState.errors);
        }
        return applicationIsValid;
    }, [blockingMessages.length, methods, setFrontendValidityField]);

    const handleDownloadApplication = React.useCallback(async () => {
        const applicationIsValid = await runValidation();
        if (!applicationIsValid && !window.confirm(invalidDownloadConfirmation)) return;

        const currentValues = methods.getValues() as TValues;
        const {[documentFieldName]: _documentsField, ...rest} = currentValues as any;
        const application = sanitizeForExport ? sanitizeForExport(rest as TValues) : rest;
        const archiveDocuments = archiveDocumentsFromUploads(deriveDocuments(application as TValues), uploads as UploadValue);
        const blob = await buildApplicationZip(application, {
            appId: contentPack.appId,
            documents: archiveDocuments,
        });
        downloadBlob(blob, downloadFilename);
    }, [contentPack.appId, deriveDocuments, documentFieldName, downloadFilename, invalidDownloadConfirmation, methods, runValidation, sanitizeForExport, uploads]);

    const handleFinalize = React.useCallback(() => {
        if (!finalize) return;
        methods.handleSubmit((data) => finalize(data as TValues, methods))();
    }, [finalize, methods]);

    const flow = useValidationFlow({
        trigger: runValidation,
        errors: methods.formState.errors as FieldErrors<any>,
        isValid: methods.formState.isValid && !hasBlockingError,
        blockingErrorMessages: blockingMessages,
        labels,
        requireDownloadBeforeFinalize: requireDownloadBeforeFinalize ?? options.requireDownloadBeforeFinalize,
        finalizeDisabledTooltip: finalizeDisabledTooltip?.(methods.formState.isValid, hasBlockingError),
        onDownload: handleDownloadApplication,
        onFinalize: finalize ? handleFinalize : undefined,
    });

    const {importError, importWarning, setImportError, importApplication} = useApplicationImport(
        methods,
        {
            defaultValues,
            resolve: resolveImport,
            loadExtras: async (zip, application) => ({
                [documentFieldName]: await formDocumentFilesFromZip(
                    zip,
                    deriveDocuments(application as TValues),
                ),
            }),
            afterImport: afterImport ?? (async () => {
                await runValidation();
            }),
        },
    );

    const missingDocumentIds = flow.hasCheckedValidity
        ? getMissingDocumentIds(documents, uploads)
        : [];
    const context: ResearchApplicationShellRenderContext<TValues> = {
        mode,
        methods,
        values,
        hasBlockingError,
        blockingErrorMessages: blockingMessages,
    };

    return (
        <FormProvider {...methods}>
            <Container className="py-4 mb-4">
                <header className="d-flex justify-content-between align-items-center mb-3">
                    {contentPack.branding.logos.map((logo) => (
                        <img
                            key={logo.alt}
                            src={logo.src}
                            alt={logo.alt}
                            style={{maxHeight: logo.maxHeight ?? 48, width: 'auto'}}
                        />
                    ))}
                </header>

                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h1 className="h3 mb-0">{contentPack.branding.title}</h1>
                    <FormActionButtons clear={clear} afterClear={afterClear} />
                </div>

                {renderIntro}

                <ApplicationImport
                    className="mb-3"
                    expectedAppId={contentPack.appId}
                    onImport={importApplication}
                    onError={setImportError}
                />
                {importError && (
                    renderImportError ? renderImportError(importError, () => setImportError(null)) : (
                        <Alert variant="danger" onClose={() => setImportError(null)} dismissible>
                            Import failed: {importError}
                        </Alert>
                    )
                )}
                {importWarning && (
                    renderImportWarning ? renderImportWarning(importWarning) : (
                        <Alert variant="warning">{importWarning}</Alert>
                    )
                )}

                <Form onSubmit={methods.handleSubmit((data) => finalize?.(data as TValues, methods))}>
                    <BlockingGate
                        blocked={hasBlockingError}
                        blockingErrorMessages={blockingMessages}
                        gate={<div id={sectionIds.dataAccess}>{sections.dataAccess(context)}</div>}
                    >
                        <div id={sectionIds.project}>{sections.project(context)}</div>
                        <div id={sectionIds.authors}>{sections.authors(context)}</div>
                        {options.allowExternalFunding && sections.funding && (
                            <div id={sectionIds.funding}>{sections.funding(context)}</div>
                        )}
                        <div id={sectionIds.datasets}>{sections.datasets(context)}</div>
                        {sections.afterDatasets?.(context)}
                        <div id={sectionIds.requiredDocuments}>
                            <RequiredDocumentsSection
                                documents={documents}
                                uploads={uploads}
                                onSetFile={setFile}
                                missingDocumentIds={missingDocumentIds}
                                header={documentHeader}
                                groups={documentGroups?.(documents)}
                            />
                        </div>
                    </BlockingGate>
                </Form>
            </Container>

            <StickyValidationBar {...flow} />
        </FormProvider>
    );
}
