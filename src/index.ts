/**
 * @rdsc/research-form-core — public API.
 *
 * A reusable, institution-agnostic toolkit for building research data
 * application forms: a schema-driven field renderer, validation UI, a dataset
 * selection table, an identifier linkage graph and the shared types. All
 * institution-specific content is supplied by the consuming application (see
 * the ContentPack contract).
 */

// Form rendering & schema
export * from './form/flatFormSchema';
export * from './form/flatFormRenderer';
export * from './form/modalFormEditor';
export * from './form/modalListField';
export * from './form/documentUploadCard';
export * from './form/requiredDocumentsSection';
export * from './form/blockingGate';
export * from './form/projectSection';
export * from './form/fundingSection';
export * from './form/dataAccessSection';
export * from './form/dataAccessGate';
export * from './form/documentUploads';
export * from './form/authorsField';
export * from './form/applicationImport';
export * from './form/useApplicationImport';
export * from './form/formActionButtons';
export * from './form/researchApplicationShell';

// Validation UI & shared validation types
export * from './form/validationTypes';
export * from './form/buildValidationErrorItems';
export * from './form/useValidationFlow';
export * from './form/useFormPersistence';
export * from './form/stickyValidationBar';
export * from './form/errorReviewWizard';

// Dataset types, table, access matrix & access validation
export * from './data/datasetTypes';
export * from './data/datasetTable';
export * from './data/datasetAccessMatrix';
export * from './data/datasetAccessHelpers';
export * from './data/datasetSection';
export * from './data/validateDatasetAccess';
export * from './data/datasetDetailsModal';

// Identifier linkage graph
export * from './graph/linkageGraph';
export * from './graph/linkageGraphView';

// Hooks & utilities
export * from './hooks/useBlockingErrors';
export * from './utils/formatAuthorName';
export * from './utils/applicationArchive';
export * from './utils/confirmClearForm';
export * from './utils/htmlText';

// Shared constants
export * from './constants/countries';
export * from './constants/timeUnits';

// Content contract, catalogue metadata & validation
export * from './content/contentPack';
export * from './content/validateContentPack';
