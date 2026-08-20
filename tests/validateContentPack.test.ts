import { describe, expect, it } from 'vitest';
import { validateContentPack } from '../src/content/validateContentPack';
import type { ContentPack } from '../src/content/contentPack';

const validPack = (): ContentPack => ({
  appId: 'test-app',
  branding: { title: 'Test app', logos: [] },
  identifierMetadata: { id_a: 'Identifier A', id_b: 'Identifier B' },
  identifierLinkages: [['id_a', 'id_b']],
  datasets: [
    {
      abbreviation: 'DATA',
      name: 'Dataset',
      category: 'Demo',
      identifiers: ['id_a'],
      accessType: 'Remote',
      parts: [{ abbreviation: 'P1', label: 'Part 1' }],
    } as any,
  ],
  modes: [{ id: 'external', label: 'External' }],
});

describe('validateContentPack', () => {
  it('accepts a consistent content pack', () => {
    expect(validateContentPack(validPack())).toEqual([]);
  });

  it('reports duplicate dataset abbreviations, unknown identifiers, duplicate parts, and duplicate modes', () => {
    const pack = validPack();
    pack.datasets = [
      {
        abbreviation: 'DATA',
        name: 'Dataset A',
        category: 'Demo',
        identifiers: ['missing_id'],
        accessType: 'Remote',
        parts: [
          { abbreviation: 'P1', label: 'Part 1' },
          { abbreviation: 'P1', label: 'Part 1 duplicate' },
        ],
      } as any,
      { abbreviation: 'DATA', name: 'Dataset B', category: 'Demo', identifiers: [], accessType: 'Remote' } as any,
    ];
    pack.modes = [
      { id: 'external', label: 'External' },
      { id: 'external', label: 'External duplicate' },
    ];

    expect(validateContentPack(pack)).toEqual(
      expect.arrayContaining([
        { severity: 'error', message: 'Duplicate dataset abbreviation "DATA".' },
        {
          severity: 'error',
          message: 'Dataset "DATA" references identifier "missing_id" with no entry in identifierMetadata.',
        },
        { severity: 'error', message: 'Dataset "DATA" has duplicate part "P1".' },
        { severity: 'error', message: 'Duplicate mode id "external".' },
      ]),
    );
  });

  it('warns for provenance, branding, and linkage quality issues', () => {
    const pack = validPack();
    pack.appId = '';
    pack.branding.title = '';
    pack.identifierLinkages = [['id_a', 'unknown']];

    expect(validateContentPack(pack)).toEqual(
      expect.arrayContaining([
        { severity: 'warning', message: 'ContentPack branding has no title.' },
        {
          severity: 'warning',
          message: 'ContentPack has no appId; exported archives cannot be provenance-checked on import.',
        },
        { severity: 'warning', message: 'Linkage references unknown identifier "unknown".' },
      ]),
    );
  });

  it('requires at least one mode', () => {
    const pack = validPack();
    pack.modes = [];

    expect(validateContentPack(pack)).toContainEqual({
      severity: 'error',
      message: 'ContentPack has no modes.',
    });
  });
});
