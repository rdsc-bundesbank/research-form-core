/**
 * Institution-agnostic dataset types used across the engine.
 *
 * These describe the SHAPE of a research dataset. The concrete catalogue of
 * datasets, the list of identifiers and their human-readable descriptions are
 * content and live in the consuming application, not here.
 */
import type { FieldDef } from '../form/flatFormSchema';

export type RequiredDocumentType = 'Excel' | 'PDF' | 'Word';
export type RequiredPer = 'project' | 'researcher';
export type IdentifierAvailability = 'Original' | 'Anonymized';

/**
 * An identifier is just a string key at the engine level. Applications may
 * narrow this to their own union (e.g. keyof typeof IDENTIFIER_METADATA).
 */
export type Identifier = string;

export type AuthorDocumentCondition = Partial<{
  role: 'internal' | 'external';
  requires_data_access: boolean;
}>;

export interface RequiredDocument {
  type?: RequiredDocumentType;
  name: string;
  url: string;
  helpUrl?: string;
  digital: boolean;
  required_per?: RequiredPer;
  internal_only?: boolean; // default: false
  /**
   * Skip this document if one of these conditions matches the current context.
   * For required_per === 'researcher', the author condition is checked against each researcher.
   */
  not_required_when?: {
    author?: AuthorDocumentCondition;
  };
}

export interface DatasetPart {
  abbreviation: string;
  description?: string;
  start_year?: number;
  end_year?: number;
}

export interface Dataset {
  abbreviation: string;
  name: string;
  periodicity: 'Monthly' | 'Quarterly' | 'Bi-annual' | 'Annual' | string;
  start_year: number;
  start_month?: number;
  start_quartal?: number;
  end_year?: number;
  end_month?: number;
  end_quartal?: number;

  identifier_availabilities?: IdentifierAvailability[];

  identifiers?: Identifier[];

  variables?: string[];

  accessType: 'Onsite' | 'Secure onsite' | 'Remote' | string;
  containsPersonalInformation: boolean;

  requiredRegistration?: string[];
  requiredDocuments?: RequiredDocument[];

  url?: string;
  category: string;
  availableTo?: string;

  parts?: DatasetPart[];

  /**
   * Application-defined key for validating this dataset's `extra` answers with
   * richer logic than FieldDef can express (for example a Zod schema registry).
   */
  extraSchemaKey?: string;

  /**
   * Application-defined key for rendering additional dataset-specific controls
   * inside the dataset details modal.
   */
  extraRendererKey?: string;

  /**
   * Arbitrary extra questions to ask when this dataset is selected (e.g. an
   * observation period, or a custom selector). Rendered by FlatFormRenderer in
   * the dataset modal; the answers are stored on the selection's `extra` bag.
   * Field names are local to the dataset, so `visibleWhen` predicates reference
   * sibling extra-field names directly.
   */
  extraFields?: FieldDef[];
}
