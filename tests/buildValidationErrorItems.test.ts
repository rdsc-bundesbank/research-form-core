import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildValidationErrorItems } from '../src/form/buildValidationErrorItems';

describe('buildValidationErrorItems', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('puts blocking errors before field errors', () => {
    expect(
      buildValidationErrorItems(
        { project_title: { message: 'Required', type: 'required' } },
        [{ card: 'datasets', idx: 0, text: 'Resolve dataset access first.' }],
        { fieldLabels: { project_title: 'Project title' } },
      ),
    ).toEqual([
      {
        id: 'blocking-datasets-0',
        message: 'Resolve dataset access first.',
        targetId: 'blocking-error-anchor',
        severity: 'blocking',
      },
      {
        id: 'field-project_title',
        message: 'Project title: Required',
        path: 'project_title',
        targetId: undefined,
        severity: 'error',
      },
    ]);
  });

  it('formats indexed array errors using configured group and field labels', () => {
    const items = buildValidationErrorItems(
      { authors: [{ surname: { message: 'Required', type: 'required' } }] } as any,
      [],
      {
        indexedGroups: { authors: 'Researcher' },
        fieldLabels: { surname: 'Family name' },
        sectionTargets: { authors: 'section-authors' },
      },
    );

    expect(items).toEqual([
      expect.objectContaining({
        message: 'Researcher 1 – Family name: Required',
        path: 'authors.0.surname',
        targetId: 'section-authors',
      }),
    ]);
  });

  it('uses attachment labels and a common missing-file message', () => {
    const items = buildValidationErrorItems(
      { attachmentFiles: { cv_alice: { message: 'Invalid input', type: 'custom' } } },
      [],
      {
        attachmentsKey: 'attachmentFiles',
        attachmentLabels: { cv_alice: 'CV for Alice' },
        missingFileMessage: 'Please upload this document.',
      },
    );

    expect(items[0].message).toBe('CV for Alice: Please upload this document.');
  });

  it('prefers a concrete field anchor over the section target when present', () => {
    const getElementById = vi.fn().mockReturnValue({});
    vi.stubGlobal('document', { getElementById });

    const items = buildValidationErrorItems(
      { project_title: { message: 'Required', type: 'required' } },
      [],
      { sectionTargets: { project_title: 'section-project' } },
    );

    expect(getElementById).toHaveBeenCalledWith('field-project_title');
    expect(items[0].targetId).toBe('field-project_title');
  });
});
