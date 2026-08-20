import { describe, expect, it } from 'vitest';
import {
  datasetsForMode,
  resolveDatasetExtraFields,
  resolveFormOptions,
  type ContentPack,
} from '../src/content/contentPack';

const pack: Pick<ContentPack, 'datasets' | 'modes'> = {
  datasets: [
    { abbreviation: 'PUB', name: 'Public data', category: 'Demo', identifiers: [], accessType: 'Onsite' } as any,
    { abbreviation: 'INT', name: 'Internal data', category: 'Demo', identifiers: [], accessType: 'Remote' } as any,
  ],
  modes: [
    { id: 'internal', label: 'Internal' },
    {
      id: 'external',
      label: 'External',
      includeDataset: (dataset) => dataset.abbreviation !== 'INT',
      transformDataset: (dataset) => ({ ...dataset, accessType: 'Secure onsite' }),
    },
  ],
};

describe('content pack helpers', () => {
  it('merges form options with engine defaults without dropping explicit false values', () => {
    expect(
      resolveFormOptions({
        allowAdditionalData: false,
        allowMixedProjects: true,
        maxDatasets: 3,
      }),
    ).toMatchObject({
      allowAdditionalData: false,
      allowLinkage: true,
      allowMixedProjects: true,
      maxDatasets: 3,
      minApplicants: 1,
      requireDownloadBeforeFinalize: true,
    });
  });

  it('filters and transforms datasets for a mode', () => {
    expect(datasetsForMode(pack, 'external')).toEqual([
      expect.objectContaining({ abbreviation: 'PUB', accessType: 'Secure onsite' }),
    ]);
  });

  it('returns the original catalogue for an unknown mode', () => {
    expect(datasetsForMode(pack, 'review')).toBe(pack.datasets);
  });

  it('combines common dataset extra fields before dataset-specific fields', () => {
    const common = { name: 'justification', type: 'textarea', label: 'Why?' } as any;
    const specific = { name: 'country', type: 'text', label: 'Country' } as any;

    expect(
      resolveDatasetExtraFields({ datasetExtraFields: [common] }, { extraFields: [specific] }),
    ).toEqual([common, specific]);
  });
});
