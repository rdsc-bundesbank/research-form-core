import type {DatasetSelection} from './datasetTable';
import type {AuthorSummary} from './datasetAccessMatrix';

/**
 * Validates that for every visible dataset/part row there is at least one author
 * with data access selected.
 */
export const hasAtLeastOneAccessPerRow = (
    selections: (DatasetSelection & { authorAccess?: boolean[][] })[],
    authors: AuthorSummary[],
): boolean => {
    // An allowed author with no persisted access cell counts as having access:
    // a freshly added dataset has no authorAccess matrix yet, but the access
    // matrix UI shows allowed authors as checked by default. Reading an unset
    // cell as `false` would otherwise flag every new dataset until a cell is
    // toggled (which is the only thing that persists the matrix).
    const rowHasAccess = (
        row: boolean[],
        isInternalOnly: boolean,
        isOriginalOnly: boolean,
    ): boolean =>
        authors.some((author, authorIdx) => {
            const isExt = author.role === 'external';
            const disabled = (isInternalOnly || isOriginalOnly) && isExt;
            const requiresAccess = author.requires_data_access !== false;
            const allowed = !disabled && requiresAccess;
            if (!allowed) return false;
            const cell = row[authorIdx];
            return cell === undefined ? true : !!cell;
        });

    return selections.every((sel) => {
        const dataset: any = sel.dataset;
        const isInternalOnly = dataset.availableTo === 'Internal';
        const isOriginalOnly = sel.options?.identifier_availability_selection === 'Original';
        const matrix: boolean[][] = sel.authorAccess ?? [];

        const hasParts =
            dataset.parts && dataset.parts.length > 0 && sel.parts && sel.parts.length > 0;
        const visibleParts = hasParts
            ? dataset.parts.filter((p: any) => sel.parts?.includes(p.abbreviation))
            : null;

        if (visibleParts && visibleParts.length > 0) {
            return visibleParts.every((part: any) => {
                const partIdx = (dataset.parts || []).findIndex(
                    (p: any) => p.abbreviation === part.abbreviation,
                );
                if (partIdx < 0) return false;
                return rowHasAccess(matrix[partIdx] ?? [], isInternalOnly, isOriginalOnly);
            });
        }

        return rowHasAccess(matrix[0] ?? [], isInternalOnly, isOriginalOnly);
    });
};
