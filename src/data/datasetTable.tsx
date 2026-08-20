// @ts-ignore
import React, { useMemo, useState } from 'react';
import { Form, Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
import type { Dataset, Identifier } from './datasetTypes';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import Select, { MultiValue } from 'react-select';

type SelectOption = { value: string; label: string };


// NOTE: For simplicity this uses a greatly simplified TanStack Table v7-style API.
// In a real project you would import from @tanstack/react-table v8 and configure it
// accordingly. This file is only meant to illustrate the structure.

export type DatasetSelection = {
  dataset: Dataset;
  parts: string[]; // abbreviations
  options: Record<string, string>; // dataset-specific options like CSDB module
  // Answers to the dataset's extraFields, keyed by field name.
  extra?: Record<string, any>;
  // authorAccess[partIndex][authorIndex] = whether this author has access to this part
  authorAccess?: boolean[][];
};

export type DatasetSelectorProps = {
  value: DatasetSelection[];
  onChange: (value: DatasetSelection[]) => void;
  datasets: Dataset[];
  /** Human-readable descriptions for each identifier, keyed by identifier code. */
  identifierMetadata: Record<string, string>;
  /** Maximum number of datasets that may be selected (undefined = unlimited). */
  maxSelected?: number;
  /** Optional Bootstrap class per dataset category. Default is bg-secondary. */
  categoryBadgeClasses?: Record<string, string>;
  onEditDatasetParts?: (dataset: Dataset) => void;
  mode?: 'internal' | 'external';
};

const getCategoryBadgeClass = (
  category: string,
  categoryBadgeClasses?: Record<string, string>,
): string => categoryBadgeClasses?.[category] ?? 'bg-secondary';

export const DatasetTable: React.FC<DatasetSelectorProps> = ({
  value,
  onChange,
  datasets,
  identifierMetadata,
  maxSelected,
  categoryBadgeClasses,
  onEditDatasetParts,
  mode = 'external',
}) => {
  const atSelectionLimit = maxSelected != null && value.length >= maxSelected;
  const [selectedPeriodicities, setSelectedPeriodicities] = useState<string[]>([]);
  const [selectedAccessTypes, setSelectedAccessTypes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedIdentifiers, setSelectedIdentifiers] = useState<Identifier[]>([]);
  const { globalMinYear, globalMaxYear } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    datasets.forEach((d) => {
      if (d.start_year) {
        min = Math.min(min, d.start_year);
      }
      if (d.end_year) {
        max = Math.max(max, d.end_year);
      }
    });

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { globalMinYear: undefined as number | undefined, globalMaxYear: undefined as number | undefined };
    }

    return { globalMinYear: min, globalMaxYear: max };
  }, [datasets]);

  // dual-handle year range state: [min, max]
  const [yearRange, setYearRange] = useState<[number, number] | undefined>(() =>
    globalMinYear !== undefined && globalMaxYear !== undefined
      ? [globalMinYear, globalMaxYear]
      : undefined,
  );

  // keep yearRange in sync if datasets change
  React.useEffect(() => {
    if (globalMinYear !== undefined && globalMaxYear !== undefined) {
      setYearRange((prev) => {
        if (!prev) return [globalMinYear, globalMaxYear];
        const [prevMin, prevMax] = prev;
        return [
          Math.max(globalMinYear, prevMin),
          Math.min(globalMaxYear, prevMax),
        ];
      });
    } else {
      setYearRange(undefined);
    }
  }, [globalMinYear, globalMaxYear]);



  const isDatasetChecked = (dataset: Dataset): boolean => {
    const sel = value.find((v) => v.dataset.abbreviation === dataset.abbreviation);
    if (!sel) return false;
    // If dataset has parts, checkbox reflects whether at least one part is selected
    if (dataset.parts && dataset.parts.length > 0) {
      return sel.parts && sel.parts.length > 0;
    }
    // If dataset has no parts, checkbox reflects dataset selection itself
    return true;
  };


  const periodicityOptions: SelectOption[] = useMemo(
    () =>
      Array.from(
        new Set(
          datasets
            .map((d) => d.periodicity)
            .filter((v): v is string => !!v),
        ),
      )
        .sort()
        .map((p) => ({ value: p, label: p })),
    [datasets],
  );

  const accessOptions: SelectOption[] = useMemo(() => {
    const rawAccessTypes = datasets
      .map((d) => d.accessType)
      .filter((v): v is string => !!v);

    const normalizedTypes = new Set<string>(rawAccessTypes);

    // In internal mode, expose a pseudo access type for filtering.
    if (mode === 'internal' && rawAccessTypes.includes('Onsite')) {
      normalizedTypes.add('Secure onsite');
    }

    return Array.from(normalizedTypes)
      .sort()
      .map((a) => ({ value: a, label: a }));
  }, [datasets, mode]);

  const categoryOptions: SelectOption[] = useMemo(
    () =>
      Array.from(
        new Set(
          datasets
            .map((d) => d.category)
            .filter((v): v is string => !!v),
        ),
      )
        .sort()
        .map((c) => ({ value: c, label: c })),
    [datasets],
  );

  const identifierOptions: SelectOption[] = useMemo(
    () =>
      Object.keys(identifierMetadata)
        .sort()
        .map((id) => ({ value: id, label: id })),
    [identifierMetadata],
  );

  // --- UPDATED: combined filters ---
  const filteredData = useMemo(
    () =>
      datasets.filter((d) => {

        // year range filter
        if (
          globalMinYear &&
          globalMaxYear &&
          yearRange &&
          yearRange.length === 2
        ) {
          const [selMin, selMax] = yearRange;
          const dsStart = d.start_year ?? d.end_year ?? selMin;
          const dsEnd = d.end_year ?? d.start_year ?? selMax;
          if (!(dsEnd >= selMin && dsStart <= selMax)) {
            return false;
          }
        }

        // periodicity filter (OR within periodicity)
        if (
          selectedPeriodicities.length > 0 &&
          d.periodicity &&
          !selectedPeriodicities.includes(d.periodicity)
        ) {
          return false;
        }
        if (
          selectedPeriodicities.length > 0 &&
          !d.periodicity // dataset without periodicity should not pass if filter active
        ) {
          return false;
        }

        // access filter
        if (selectedAccessTypes.length > 0) {
          if (!d.accessType) {
            return false;
          }

          const matchesDirect = selectedAccessTypes.includes(d.accessType);

          const matchesSecureOnsiteInternal =
            mode === 'internal' &&
            d.accessType === 'Onsite' &&
            selectedAccessTypes.includes('Secure onsite');

          if (!matchesDirect && !matchesSecureOnsiteInternal) {
            return false;
          }
        }

        // category filter
        if (
          selectedCategories.length > 0 &&
          d.category &&
          !selectedCategories.includes(d.category)
        ) {
          return false;
        }
        if (selectedCategories.length > 0 && !d.category) {
          return false;
        }

        // identifier filter (dataset must contain at least one of the selected identifiers)
        if (selectedIdentifiers.length > 0) {
          const datasetIdentifiers = d.identifiers ?? [];
          const hasMatch = datasetIdentifiers.some((identifier) =>
            selectedIdentifiers.includes(identifier),
          );
          if (!hasMatch) {
            return false;
          }
        }

        return true;
      })
      .slice() // copy before sorting
        .sort((a, b) => {
          const catA = a.category ?? '';
          const catB = b.category ?? '';
          const catCompare = catA.localeCompare(catB);
          if (catCompare !== 0) return catCompare;
          const abbrA = a.abbreviation ?? '';
          const abbrB = b.abbreviation ?? '';
          return abbrA.localeCompare(abbrB);
        }),
    [
      datasets,
      globalMinYear,
      globalMaxYear,
      yearRange,
      selectedPeriodicities,
      selectedAccessTypes,
      selectedCategories,
      selectedIdentifiers,
    ],
  );


  return (
    <div>
      {maxSelected != null && (
        <div className={`small mb-2 ${atSelectionLimit ? 'text-danger' : 'text-muted'}`}>
          {value.length} of {maxSelected} datasets selected
          {atSelectionLimit && ' — deselect one to choose a different dataset.'}
        </div>
      )}
      <Row className="mb-3">

        <Col md={3} className="mb-2">
          <h6>Category</h6>
          <Select
            isMulti
            isClearable
            options={categoryOptions}
            placeholder="All categories"
            value={categoryOptions.filter((opt) =>
              selectedCategories.includes(opt.value),
            )}
            onChange={(selected: MultiValue<SelectOption>) => {
              const vals = selected.map((s) => s.value);
              setSelectedCategories(vals);
            }}
            styles={{
              container: (base) => ({ ...base, fontSize: '0.9rem' }),
              valueContainer: (base) => ({ ...base, padding: '0.25rem 0.5rem' }),
            }}
          />
        </Col>
        <Col md={3} className="mb-2">
          <h6>Periodicity</h6>
          <Select
            isMulti
            isClearable
            options={periodicityOptions}
            placeholder="All periodicities"
            value={periodicityOptions.filter((opt) =>
              selectedPeriodicities.includes(opt.value),
            )}
            onChange={(selected: MultiValue<SelectOption>) => {
              const vals = selected.map((s) => s.value);
              setSelectedPeriodicities(vals);
            }}
            styles={{
              container: (base) => ({ ...base, fontSize: '0.9rem' }),
              valueContainer: (base) => ({ ...base, padding: '0.25rem 0.5rem' }),
              multiValue: (base) => ({ ...base, backgroundColor: '#e9ecef' }),
            }}
          />
        </Col>

        <Col md={3} className="mb-2">
          <h6>Access</h6>
          <Select
            isMulti
            isClearable
            options={accessOptions}
            placeholder="All access types"
            value={accessOptions.filter((opt) =>
              selectedAccessTypes.includes(opt.value),
            )}
            onChange={(selected: MultiValue<SelectOption>) => {
              const vals = selected.map((s) => s.value);
              setSelectedAccessTypes(vals);
            }}
            styles={{
              container: (base) => ({ ...base, fontSize: '0.9rem' }),
              valueContainer: (base) => ({ ...base, padding: '0.25rem 0.5rem' }),
              multiValue: (base) => ({ ...base, backgroundColor: '#fff3cd' }),
            }}
          />
        </Col>


        <Col md={3} className="mb-2">
          <h6>Identifiers</h6>
          <Select
            isMulti
            isClearable
            options={identifierOptions}
            placeholder="All identifiers"
            value={identifierOptions.filter((opt) =>
              selectedIdentifiers.includes(opt.value as Identifier),
            )}
            onChange={(selected: MultiValue<SelectOption>) => {
              const vals = selected.map((s) => s.value as Identifier);
              setSelectedIdentifiers(vals);
            }}
            styles={{
              container: (base) => ({ ...base, fontSize: '0.9rem' }),
              valueContainer: (base) => ({ ...base, padding: '0.25rem 0.5rem' }),
            }}
          />
        </Col>
      </Row>

      {/* Year range slider (unchanged) */}
      {globalMinYear !== undefined &&
        globalMaxYear !== undefined &&
        yearRange && (
          <Form.Group className="mb-3">
            <h6>Filter by year range</h6>
            <div className="d-flex justify-content-between mb-1">
              <span>
                From: <strong>{yearRange[0]}</strong>
              </span>
              <span>
                To: <strong>{yearRange[1]}</strong>
              </span>
            </div>
            <Slider
              range
              min={globalMinYear}
              max={globalMaxYear}
              value={yearRange}
              allowCross={false}
              onChange={(vals) => {
                const [minVal, maxVal] = vals as [number, number];
                setYearRange([minVal, maxVal]);
              }}
            />
          </Form.Group>
        )}

      {/* table markup unchanged, using filteredData */}
      <div className="table-responsive mb-3">
        <table className="table table-sm table-striped">
          <thead>
            <tr>
              <th></th>
              <th>Abbreviation</th>
              <th></th>
              <th>Name</th>
              <th>Periodicity</th>
              <th>Years</th>
              <th>Access</th>
              <th>Category</th>
              <th>Identifiers</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((d) => (
              <tr key={d.abbreviation}>
                  <td>
                       <label className="custom-checkbox-label me-2">
                    <input
                      type="checkbox"
                      className="custom-checkbox-input"
                      checked={isDatasetChecked(d)}
                      readOnly
                      disabled={atSelectionLimit && !isDatasetChecked(d)}
                      onClick={() => {
                        if (atSelectionLimit && !isDatasetChecked(d)) return;
                        if (onEditDatasetParts) {
                          onEditDatasetParts(d);
                          return;
                        }
                        onChange(
                          isDatasetChecked(d)
                            ? value.filter((selection) => selection.dataset.abbreviation !== d.abbreviation)
                            : [...value, { dataset: d, parts: [], options: {} }],
                        );
                      }}
                    />
                    <span className="custom-checkbox-box" />
                  </label>
                  </td>
                <td>
                  <strong>{d.abbreviation}</strong>{' '}

                </td>
                  <td>
                      {d.url && (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted ms-1"
                      title="More information"
                    >
                      <i className="bi bi-info-circle-fill" />
                    </a>
                  )}
                  </td>
                <td>{d.name}</td>
                <td>
                  {d.periodicity && (
                    <span className="badge rounded-pill bg-dark">
                      {d.periodicity}
                    </span>
                  )}
                </td>
                <td>
                  {(d.start_year || d.end_year) && (
                    <span className="badge rounded-pill bg-secondary">
                      {d.start_year &&
                        d.end_year &&
                        d.start_year !== d.end_year &&
                        `${d.start_year}-${d.end_year}`}
                      {d.start_year &&
                        (!d.end_year || d.start_year === d.end_year) &&
                        !(!d.start_year && d.end_year) &&
                        !d.end_year &&
                        `${d.start_year}-now`}
                      {!d.start_year && d.end_year && `?- ${d.end_year}`}
                      {d.start_year &&
                        d.end_year &&
                        d.start_year === d.end_year &&
                        `${d.start_year}`}
                    </span>
                  )}
                </td>
                <td>
                  <div className="d-flex flex-wrap gap-1">
                    <span className="badge rounded-pill bg-warning text-dark">
                      {d.accessType === 'Remote' ? 'Remote' : 'On premise'}
                    </span>
                  </div>
                </td>
                <td>
                  <span
                    className={`badge rounded-pill ${getCategoryBadgeClass(
                      d.category,
                      categoryBadgeClasses,
                    )}`}
                  >
                    {d.category}
                  </span>
                </td>
                <td>
                  {d.identifiers && d.identifiers.length > 0 && (
                    <div className="d-flex flex-wrap gap-1">
                      {d.identifiers.map((identifier) => (
                        <OverlayTrigger
                          key={identifier}
                          placement="top"
                          overlay={(
                            <Tooltip id={`identifier-tooltip-row-${identifier}`}>
                              {identifierMetadata[identifier]}
                            </Tooltip>
                          )}
                        >
                          <span className="badge rounded-pill bg-info text-dark">
                            {identifier}
                          </span>
                        </OverlayTrigger>
                      ))}
                    </div>
                  )}
                </td>
                <td>{/* Checkbox moved next to abbreviation */}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
