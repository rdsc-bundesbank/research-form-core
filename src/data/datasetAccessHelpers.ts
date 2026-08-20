import type {DatasetSelection} from './datasetTable';
import type {AuthorSummary} from './datasetAccessMatrix';

export type DatasetAccessSelection = DatasetSelection & {authorAccess?: boolean[][]};

export const toAuthorSummaries = (authors: any[]): AuthorSummary[] =>
    authors.map((author: any, index: number) => ({
        index,
        first_name: author.first_name,
        surname: author.surname,
        role: author.role,
        requires_data_access: author.requires_data_access,
    }));

const defaultAccessForAuthor = (selection: DatasetAccessSelection, author: any): boolean => {
    const dataset = selection.dataset as any;
    const isInternalOnly = dataset && dataset.availableTo === 'Internal';
    const isOriginalOnly = selection.options?.identifier_availability_selection === 'Original';

    if (!author || author.requires_data_access === false) return false;
    if ((isInternalOnly || isOriginalOnly) && author.role === 'external') return false;
    return true;
};

export const resizeSelectionAuthorAccess = (
    selection: DatasetAccessSelection,
    previousAuthors: any[],
    nextAuthors: any[],
): DatasetAccessSelection => {
    if (!selection?.authorAccess) return selection;

    const usedPreviousIndexes = new Set<number>();
    const previousIndexes = nextAuthors.map((author, nextIndex) => {
        const previousIndex = previousAuthors.findIndex(
            (previous, index) => !usedPreviousIndexes.has(index) && previous === author,
        );
        if (previousIndex >= 0) {
            usedPreviousIndexes.add(previousIndex);
            return previousIndex;
        }
        return nextIndex < previousAuthors.length ? nextIndex : -1;
    });

    const numParts = Math.max(
        selection.authorAccess.length,
        Array.isArray(selection.parts) ? selection.parts.length : 0,
        1,
    );
    const authorAccess = Array.from({length: numParts}, (_, rowIndex) =>
        nextAuthors.map((author, nextIndex) => {
            const previousIndex = previousIndexes[nextIndex];
            return previousIndex >= 0
                ? selection.authorAccess?.[rowIndex]?.[previousIndex] ?? defaultAccessForAuthor(selection, author)
                : defaultAccessForAuthor(selection, author);
        }),
    );

    return {...selection, authorAccess};
};

export const syncSelectionOption = (
    selections: DatasetAccessSelection[],
    optionName: string,
    optionValue: string | undefined,
): {changed: boolean; selections: DatasetAccessSelection[]} => {
    let changed = false;
    const next = selections.map((selection) => {
        const current = (selection.options as any)?.[optionName];
        if (current === optionValue) return selection;
        changed = true;
        return {
            ...selection,
            options: {
                ...(selection.options ?? {}),
                [optionName]: optionValue ?? '',
            },
        };
    });

    return {changed, selections: next};
};

export const hasAuthorAccessToSelection = (
    selection: DatasetAccessSelection,
    authors: any[],
    authorIndex: number,
): boolean => {
    const author = authors[authorIndex];
    if (!defaultAccessForAuthor(selection, author)) return false;

    const datasetParts = selection.dataset?.parts ?? [];
    const selectedPartIndexes =
        datasetParts.length > 0 && selection.parts?.length > 0
            ? datasetParts
                .map((part, index) => (selection.parts.includes(part.abbreviation) ? index : -1))
                .filter((index) => index >= 0)
            : [0];

    return selectedPartIndexes.some((partIndex) => {
        const row = selection.authorAccess?.[partIndex];
        if (!row || row[authorIndex] === undefined) return true;
        return row[authorIndex];
    });
};
