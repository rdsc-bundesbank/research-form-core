import {useMemo, useState} from 'react';
import type {UseFormReturn} from 'react-hook-form';
import type {DocumentSpec} from './documentUploadCard';
import {readDocumentFromZip, type ArchiveDocument} from '../utils/applicationArchive';
import type JSZip from 'jszip';

export type UploadValue = Record<string, File | null>;

export function useLocalDocumentUploads(methods: UseFormReturn<any>, presenceField: string) {
    const [uploads, setUploads] = useState<UploadValue>({});

    const setFile = (id: string, file: File | null) => {
        setUploads((prev) => ({...prev, [id]: file}));
        methods.setValue(`${presenceField}.${id}` as any, !!file as any, {shouldValidate: true});
    };

    const clearUploads = () => setUploads({});

    return {uploads, setFile, clearUploads};
}

export function useFormDocumentUploads(methods: UseFormReturn<any>, fileField: string) {
    const files = (methods.watch(fileField) ?? {}) as Record<string, File[] | undefined>;
    const uploads = useMemo(
        () => Object.fromEntries(
            Object.entries(files).map(([id, value]) => [id, value?.[0] ?? null]),
        ) as UploadValue,
        [files],
    );

    const setFile = (id: string, file: File | null) => {
        methods.setValue(`${fileField}.${id}` as any, (file ? [file] : []) as any, {
            shouldDirty: true,
            shouldValidate: true,
        });
        void methods.trigger();
    };

    return {uploads, setFile, files};
}

export const missingDocumentIds = (
    documents: Pick<DocumentSpec, 'id'>[],
    uploads: UploadValue,
): string[] => documents.filter((document) => !uploads[document.id]).map((document) => document.id);

export const documentLabelMap = <T extends DocumentSpec & {textLabel?: string}>(
    documents: T[],
): Record<string, string> => Object.fromEntries(
    documents.map((document) => [document.id, document.textLabel ?? String(document.label)]),
);

export const archiveDocumentsFromUploads = <T extends DocumentSpec & {filenameBase?: string}>(
    documents: T[],
    uploads: UploadValue,
): ArchiveDocument[] => documents
    .filter((document) => uploads[document.id])
    .map((document) => ({
        id: document.id,
        base: document.filenameBase ?? document.id,
        file: uploads[document.id]!,
    }));

export async function formDocumentFilesFromZip<T extends DocumentSpec & {filenameBase?: string}>(
    zip: JSZip,
    documents: T[],
): Promise<Record<string, File[]>> {
    const files: Record<string, File[]> = {};
    await Promise.all(
        documents.map(async (document) => {
            const file = await readDocumentFromZip(zip, document.filenameBase ?? document.id);
            if (file) files[document.id] = [file];
        }),
    );
    return files;
}
