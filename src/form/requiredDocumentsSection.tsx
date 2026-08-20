import React from 'react';
import {DocumentUploadCard, type DocumentSpec} from './documentUploadCard';

export interface RequiredDocumentGroup<T extends DocumentSpec = DocumentSpec> {
    header: React.ReactNode;
    documents: T[];
}

export interface RequiredDocumentsSectionProps<T extends DocumentSpec = DocumentSpec> {
    /** Required documents for the current form state. */
    documents: T[];
    uploads: Record<string, File | null>;
    onSetFile: (id: string, file: File | null) => void;
    /** Ids of required documents still missing (after a validity check) — shown red. */
    missingDocumentIds: string[];
    header?: React.ReactNode;
    groups?: RequiredDocumentGroup<T>[];
}

/** Hosts the engine's DocumentUploadCard for derived required documents. */
export function RequiredDocumentsSection<T extends DocumentSpec>({
    documents,
    uploads,
    onSetFile,
    missingDocumentIds,
    header = 'Supporting documents',
    groups,
}: RequiredDocumentsSectionProps<T>) {
    if (documents.length === 0) return null;

    if (groups) {
        return (
            <>
                {groups
                    .filter((group) => group.documents.length > 0)
                    .map((group, index) => (
                        <DocumentUploadCard
                            key={index}
                            header={group.header}
                            documents={group.documents}
                            value={uploads}
                            onChange={onSetFile}
                            missingIds={missingDocumentIds}
                        />
                    ))}
            </>
        );
    }

    return (
        <DocumentUploadCard
            header={header}
            documents={documents}
            value={uploads}
            onChange={onSetFile}
            missingIds={missingDocumentIds}
        />
    );
}
