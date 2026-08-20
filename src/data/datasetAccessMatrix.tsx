// @ts-ignore
import React from 'react';
import {Table, Form} from 'react-bootstrap';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import type {Dataset} from './datasetTypes';
import {formatAuthorName} from '../utils/formatAuthorName';
import type {DatasetSelection} from './datasetTable';

export type AuthorSummary = {
    index: number;
    first_name?: string;
    surname?: string;
    role?: 'internal' | 'external';
    requires_data_access?: boolean;
};

interface Props {
    selections: (DatasetSelection & { authorAccess?: boolean[][] })[];
    authors: AuthorSummary[];
    onChange: (next: (DatasetSelection & { authorAccess?: boolean[][] })[]) => void;
    onEditDatasetParts?: (dataset: Dataset) => void;
}

const getAuthorLabel = (a: AuthorSummary) => formatAuthorName({
    first_name: a.first_name,
    surname: a.surname,
}, a.index);

const ensureAccessRowLength = (
    row: boolean[] | undefined,
    authors: AuthorSummary[],
    isInternalOnly: boolean,
    isOriginalOnly: boolean,
): boolean[] => {
    const accessRow = row ? [...row] : [];
    while (accessRow.length < authors.length) {
        const idx = accessRow.length;
        const a = authors[idx];
        const isExt = a.role === 'external';
        if (!a.requires_data_access) {
            accessRow.push(false);
        } else if ((isInternalOnly || isOriginalOnly) && isExt) {
            // external on restricted dataset: always false
            accessRow.push(false);
        } else {
            // for internal or allowed external on unrestricted dataset, default to NO access
            accessRow.push(true);
        }
    }
    return accessRow;
};

export const DatasetAccessMatrix: React.FC<Props> = ({selections, authors, onChange, onEditDatasetParts}) => {

    const toggleAccess = (rowIdx: number, partIdx: number, authorIdx: number) => {
        const sel = selections[rowIdx];
        const dataset = sel.dataset as Dataset;
        const author = authors[authorIdx];

        const isInternalOnly = (dataset as any).availableTo === 'Internal';
        const isOriginalOnly = sel.options.identifier_availability_selection === 'Original';
        const isExternalAuthor = author.role === 'external';

        // Block access for external researchers if dataset is internal-only or original-only
        if ((isInternalOnly || isOriginalOnly) && isExternalAuthor) {
            return;
        }

        // Do not allow toggling access if the author does not require data access
        if (author.requires_data_access === false) {
            return;
        }

        const nextSelections = [...selections];
        const matrix: boolean[][] = sel.authorAccess ? sel.authorAccess.map((row) => [...row]) : [];

        // ensure we have a row for this part
        while (matrix.length <= partIdx) {
            matrix.push([]);
        }

        const expandedRow = ensureAccessRowLength(matrix[partIdx], authors, isInternalOnly, isOriginalOnly);
        expandedRow[authorIdx] = !expandedRow[authorIdx];
        matrix[partIdx] = expandedRow;

        nextSelections[rowIdx] = {...sel, authorAccess: matrix};
        onChange(nextSelections);
    };


    const removeDataset = (rowIdx: number) => {
        const next = selections.filter((_, i) => i !== rowIdx);
        onChange(next);
    };

    if (!selections.length || !authors.length) {
        return null;
    }

    return (
        <div className="mt-3">
            <h6>Data access per author</h6>
            <p id="dataset-access-validation" className="text-muted">
                For each dataset, you can specify which authors require access. Each dataset row must
                have at least one author with data access selected.
            </p>
            <Table size="sm" bordered responsive aria-describedby="dataset-access-validation">
                <thead>
                <tr>
                    <th>Dataset / Part</th>
                    {authors.map((a) => (
                        <th key={a.index} className="text-center">
                            <span>
            {getAuthorLabel(a)}
        </span>
                            <div className="mt-1 small text-muted">
                                {a.role === 'external' ? (
                                    <>
                                        External researcher
                                    </>
                                ) : (
                                    <>
                                        Internal researcher
                                    </>
                                )}
                                {a.requires_data_access === false && (
                                    <span className="badge rounded-pill bg-secondary ms-1">No data</span>
                                )}
                            </div>

                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {selections.map((sel, rowIdx) => {
                    const dataset = sel.dataset as Dataset;
                    const isOriginalOnly = sel.options.identifier_availability_selection === 'Original';
                    // Only show parts that are actually selected in sel.parts
                    const parts =
                        dataset.parts && dataset.parts.length > 0 && sel.parts && sel.parts.length > 0
                            ? dataset.parts.filter((p) => sel.parts.includes(p.abbreviation))
                            : null;
                    const isInternalOnly = (dataset as any).availableTo === 'Internal';
                    const matrix: boolean[][] = sel.authorAccess ?? [];

                    const rows: React.ReactNode[] = [];

                    const renderAuthorCell = (
                        rowIdx: number,
                        partIdx: number,
                        author: AuthorSummary,
                        authorIdx: number,
                        accessRow: boolean[]
                    ) => {
                        const isExt = author.role === 'external';
                                    const disabled = (isInternalOnly || isOriginalOnly) && isExt;

                                    const requiresAccess = author.requires_data_access !== false;
                                    const effectiveDisabled = disabled || !requiresAccess;
                                    const checked = requiresAccess ? !!accessRow[authorIdx] : false;


                                    let disabledReason: string | undefined;
                                    if (!requiresAccess) {
                                        disabledReason = 'This author does not require data access.';
                                    } else if (isExt && isInternalOnly) {
                                        disabledReason = 'This dataset is restricted to internal researchers.';
                                    } else if (isExt && isOriginalOnly) {
                                        disabledReason = 'External researchers cannot access datasets with original identifiers.';
                                    }
                        const handleChange = () => {
                            if (!effectiveDisabled) toggleAccess(rowIdx, partIdx, authorIdx);
                        };

                        return (
                            <td key={author.index} className="text-center">
                                {disabledReason ? (
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={<Tooltip
                                            id={`author-access-tooltip-${rowIdx}-${partIdx}-${authorIdx}`}>{disabledReason}</Tooltip>}
                                    >
                                        <span className="d-inline-block" style={{cursor: 'not-allowed'}}>
                                            <span style={{display: 'inline-block', pointerEvents: 'auto'}}>
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={checked}
                                                    disabled={effectiveDisabled}
                                                    onChange={handleChange}
                                                />
                                            </span>
                                        </span>
                                    </OverlayTrigger>
                                ) : (
                                    <Form.Check type="checkbox" checked={checked} disabled={effectiveDisabled}
                                                onChange={handleChange}/>
                                )}
                            </td>
                        );
                    };

                    const renderDatasetCell = (rowIdx: number, dataset: Dataset, showEdit: boolean) => (
                        <td>
                            <strong>{dataset.abbreviation}</strong>
                            <span
                                role="button"
                                className="text-danger ms-2"
                                onClick={() => removeDataset(rowIdx)}
                            >
                                <i className="bi bi-trash-fill"/>
                            </span>
                            {showEdit && onEditDatasetParts && sel.dataset.parts && sel.dataset.parts.length > 0 && (
                                <span
                                    role="button"
                                    className="text-secondary ms-2"
                                    onClick={() => onEditDatasetParts(sel.dataset as Dataset)}
                                >
                                    <i className="bi bi-pencil-fill"/>
                                </span>
                            )}
                        </td>
                    );

                    if (parts && parts.length > 0) {
                        // Header row for dataset (no checkboxes)
                        rows.push(
                            <tr key={`${dataset.abbreviation}-header`}>
                                {renderDatasetCell(rowIdx, dataset, !!(onEditDatasetParts && sel.dataset.parts && sel.dataset.parts.length > 0))}
                                {authors.map((a) => (
                                    <td key={a.index}></td>
                                ))}
                            </tr>,
                        );

                        parts.forEach((part) => {
                            const partIdx = (dataset.parts || []).findIndex(
                                (p) => p.abbreviation === part.abbreviation,
                            );
                            if (partIdx < 0) return;
                            const row = matrix[partIdx] ?? [];
                            const rowKey = `${dataset.abbreviation}-${part.abbreviation}`;

                            const accessRow: boolean[] = ensureAccessRowLength(row, authors, isInternalOnly, isOriginalOnly);

                            rows.push(
                                <tr key={rowKey}>
                                    <td>
                                        <strong>{dataset.abbreviation}</strong>{' '}
                                        <span>{part.abbreviation}</span>
                                    </td>
                                    {authors.map((author, authorIdx) => {
                                        return renderAuthorCell(rowIdx, partIdx, author, authorIdx, accessRow);
                                    })}
                                </tr>,
                            );
                        });
                    } else {
                        // Dataset without explicit parts: treat as single part index 0
                        const row = matrix[0] ?? [];
                        const accessRow: boolean[] = ensureAccessRowLength(row, authors, isInternalOnly, isOriginalOnly);

                        rows.push(
                            <tr key={dataset.abbreviation}>
                                {renderDatasetCell(rowIdx, dataset, false)}
                                {authors.map((author, authorIdx) => {
                                    return renderAuthorCell(rowIdx, 0, author, authorIdx, accessRow)
                                })}
                            </tr>,
                        );
                    }

                    return rows;
                })}
                </tbody>
            </Table>
        </div>
    );
};
