import { describe, expect, it } from 'vitest';
import { hasAtLeastOneAccessPerRow } from '../src/data/validateDatasetAccess';

const internalAuthor = { index: 0, role: 'internal' as const, requires_data_access: true };
const externalAuthor = { index: 1, role: 'external' as const, requires_data_access: true };

describe('hasAtLeastOneAccessPerRow', () => {
  it('treats missing access cells for allowed authors as selected by default', () => {
    expect(
      hasAtLeastOneAccessPerRow(
        [{ dataset: { abbreviation: 'OPEN', availableTo: 'All' }, parts: [], options: {} } as any],
        [externalAuthor],
      ),
    ).toBe(true);
  });

  it('fails when every allowed author is explicitly unchecked', () => {
    expect(
      hasAtLeastOneAccessPerRow(
        [
          {
            dataset: { abbreviation: 'OPEN', availableTo: 'All' },
            parts: [],
            options: {},
            authorAccess: [[false, false]],
          } as any,
        ],
        [internalAuthor, externalAuthor],
      ),
    ).toBe(false);
  });

  it('ignores external authors for internal-only datasets', () => {
    expect(
      hasAtLeastOneAccessPerRow(
        [
          {
            dataset: { abbreviation: 'INT', availableTo: 'Internal' },
            parts: [],
            options: {},
            authorAccess: [[false, true]],
          } as any,
        ],
        [internalAuthor, externalAuthor],
      ),
    ).toBe(false);
  });

  it('requires access for every selected dataset part', () => {
    const selection = {
      dataset: {
        abbreviation: 'PARTS',
        availableTo: 'All',
        parts: [
          { abbreviation: 'A', label: 'A' },
          { abbreviation: 'B', label: 'B' },
          { abbreviation: 'C', label: 'C' },
        ],
      },
      parts: ['A', 'C'],
      options: {},
      authorAccess: [[true], [false], [false]],
    } as any;

    expect(hasAtLeastOneAccessPerRow([selection], [internalAuthor])).toBe(false);

    selection.authorAccess[2][0] = true;
    expect(hasAtLeastOneAccessPerRow([selection], [internalAuthor])).toBe(true);
  });

  it('excludes authors that do not require data access', () => {
    expect(
      hasAtLeastOneAccessPerRow(
        [{ dataset: { abbreviation: 'OPEN', availableTo: 'All' }, parts: [], options: {} } as any],
        [{ index: 0, role: 'internal', requires_data_access: false }],
      ),
    ).toBe(false);
  });
});
