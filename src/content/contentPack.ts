/**
 * ContentPack — the contract between the shareable form ENGINE and the
 * institution-specific CONTENT.
 *
 * The engine (renderer, validation UI, linkage graph, dataset table, shared
 * types) knows nothing about any particular institution. Everything specific
 * to a research centre — its dataset catalogue, identifier descriptions,
 * branding, texts and labels — is supplied as a ContentPack by the consuming
 * application.
 *
 * Distribution model: the engine is published as `@rdsc/research-form-core`
 * and shipped without content; each research centre keeps its own private
 * application that provides a ContentPack (and composes its own form sections).
 *
 * Note: this engine deliberately does NOT model "required registrations".
 * Whether an applicant is registered for a dataset is verified downstream, at
 * import time — not in the form. A `requiredRegistration` field is available on
 * Dataset so applications can pass that data through, but the engine never acts
 * on it.
 */

import type { Dataset } from '../data/datasetTypes';
import type { FieldDef } from '../form/flatFormSchema';

/** A logo shown in the header. `src` is resolved by the pack (import or URL). */
export interface LogoSpec {
    src: string;
    alt: string;
    /** Optional max height for the <img> (CSS length). */
    maxHeight?: string;
}

export interface BrandingContent {
    /** Document / header title. */
    title: string;
    /** Header logos, rendered left-to-right. */
    logos: LogoSpec[];
}

/**
 * How a single access mode behaves. An application typically defines an
 * "internal" and an "external" mode; each may restrict which datasets are
 * visible and rewrite them (e.g. downgrading an access type) before display.
 * These are institution policy and belong in the pack, not the engine.
 */
export interface ModeContent {
    id: string;
    label: string;
    /** Only datasets for which this returns true are visible in this mode. */
    includeDataset?: (dataset: Dataset) => boolean;
    /** Optional per-mode rewrite of a dataset before display. */
    transformDataset?: (dataset: Dataset) => Dataset;
}

/**
 * Human-readable descriptions for the identifiers used in the linkage graph and
 * dataset table, keyed by identifier code. Consumed by DatasetTable.
 */
export type IdentifierMetadata = Record<string, string>;

/**
 * Pairs of identifiers that can be linked indirectly, consumed by
 * buildLinkageGraph.
 */
export type IdentifierLinkages = [string, string][];

/**
 * Feature flags / limits a centre can set to turn parts of the form on or off
 * and to bound user input. The engine exposes these so consuming apps don't
 * each reinvent the same switches. Every field is optional; see
 * {@link resolveFormOptions} for the defaults.
 */
export interface FormOptions {
    /** Let researchers bring their own (additional/external) data. Default true. */
    allowAdditionalData?: boolean;
    /** Offer identifier linkage between datasets (and show the graph). Default true. */
    allowLinkage?: boolean;
    /** Max datasets a user may select (undefined = unlimited). */
    maxDatasets?: number;
    /** Let users pick individual parts of a dataset rather than the whole set. Default true. */
    allowDatasetParts?: boolean;
    /** Let users declare external funding organisations. Default true. */
    allowExternalFunding?: boolean;
    /** Allow internal and external researchers in the same project. Default false. */
    allowMixedProjects?: boolean;
    /** Mark the first author as "project lead". Opt-in; default false. */
    showProjectLead?: boolean;
    /** Minimum number of applicants required. Default 1. */
    minApplicants?: number;
    /** Maximum number of applicants (undefined = unlimited). */
    maxApplicants?: number;
    /** Require the application to be downloaded before it can be finalised. Default true. */
    requireDownloadBeforeFinalize?: boolean;
    /** Optional Bootstrap class per dataset category. Default is bg-secondary. */
    categoryBadgeClasses?: Record<string, string>;
}

export type ResolvedFormOptions = Required<Omit<FormOptions, 'maxDatasets' | 'maxApplicants'>> &
    Pick<FormOptions, 'maxDatasets' | 'maxApplicants' | 'categoryBadgeClasses'>;

const FORM_OPTION_DEFAULTS: ResolvedFormOptions = {
    allowAdditionalData: true,
    allowLinkage: true,
    maxDatasets: undefined,
    allowDatasetParts: true,
    allowExternalFunding: true,
    allowMixedProjects: false,
    showProjectLead: false,
    minApplicants: 1,
    maxApplicants: undefined,
    requireDownloadBeforeFinalize: true,
    categoryBadgeClasses: undefined,
};

/** Merge a pack's options with the engine defaults. */
export function resolveFormOptions(options?: FormOptions): ResolvedFormOptions {
    return { ...FORM_OPTION_DEFAULTS, ...(options ?? {}) };
}

/**
 * The complete institution-specific payload an application supplies to the
 * engine's content-driven pieces.
 */
export interface ContentPack {
    /**
     * Stable id of the producing application (e.g. "rdsc-application"). Stamped
     * into every exported archive's manifest so an application can refuse to
     * import an export created by a different tool.
     */
    appId: string;
    branding: BrandingContent;
    datasets: Dataset[];
    identifierMetadata: IdentifierMetadata;
    identifierLinkages: IdentifierLinkages;
    modes: ModeContent[];
    /**
     * Extra fields required for EVERY selected dataset (e.g. a justification).
     * These behave exactly like a dataset's own {@link Dataset.extraFields} but
     * are common to all datasets — rendered in the dataset-details dialog and
     * validated per dataset. Answers are stored alongside per-dataset extra
     * answers. See {@link resolveDatasetExtraFields}.
     */
    datasetExtraFields?: FieldDef[];
    /** Feature flags / limits; see {@link FormOptions}. */
    options?: FormOptions;
    /** Free-form copy keyed by a stable id, so the engine ships no fixed text. */
    labels?: Record<string, string>;
}

/**
 * The complete list of extra fields to collect for a given dataset: the pack's
 * common {@link ContentPack.datasetExtraFields} (required for all datasets)
 * followed by the dataset's own {@link Dataset.extraFields}. Used by the
 * dataset-details dialog (to render them) and the schema (to validate them), so
 * they never drift apart.
 */
export function resolveDatasetExtraFields(
    pack: Pick<ContentPack, 'datasetExtraFields'>,
    dataset?: { extraFields?: FieldDef[] } | null,
): FieldDef[] {
    return [...(pack.datasetExtraFields ?? []), ...(dataset?.extraFields ?? [])];
}

/**
 * The datasets visible in a given mode: the pack's dataset catalogue after the
 * mode's {@link ModeContent.includeDataset} filter and
 * {@link ModeContent.transformDataset} rewrite are applied. An unknown mode id
 * (or a mode without these hooks) yields the full catalogue unchanged. Consumed
 * by the dataset table so every app resolves modes the same way.
 */
export function datasetsForMode(
    pack: Pick<ContentPack, 'datasets' | 'modes'>,
    modeId: string,
): Dataset[] {
    const mode = pack.modes.find((m) => m.id === modeId);
    let list = pack.datasets;
    if (mode?.includeDataset) list = list.filter(mode.includeDataset);
    if (mode?.transformDataset) list = list.map(mode.transformDataset);
    return list;
}
