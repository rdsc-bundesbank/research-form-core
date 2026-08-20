import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  APPLICATION_FILE,
  DOCUMENTS_DIR,
  MANIFEST_FILE,
  buildApplicationZip,
  documentPath,
  readDocumentFromZip,
  readManifest,
} from '../src/utils/applicationArchive';

describe('application archive helpers', () => {
  it('builds a ZIP with application data, provenance manifest, and documents', async () => {
    const file = new File(['cv contents'], 'cv.alice.pdf', { type: 'application/pdf' });

    const blob = await buildApplicationZip(
      { project_title: 'Archive test' },
      {
        appId: 'test-app',
        appVersion: '1.2.3',
        coreVersion: '4.5.6',
        documents: [{ id: 'cv', base: 'cv-alice', file }],
      },
    );

    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(JSON.parse(await zip.file(APPLICATION_FILE)!.async('text'))).toEqual({
      project_title: 'Archive test',
    });

    const manifest = JSON.parse(await zip.file(MANIFEST_FILE)!.async('text'));
    expect(manifest).toMatchObject({
      appId: 'test-app',
      appVersion: '1.2.3',
      coreVersion: '4.5.6',
    });
    expect(new Date(manifest.createdAt).toString()).not.toBe('Invalid Date');

    expect(await zip.file(`${DOCUMENTS_DIR}/cv-alice.pdf`)!.async('text')).toBe('cv contents');
  });

  it('preserves the uploaded filename extension when computing document paths', () => {
    expect(documentPath('proposal-final', new File(['x'], 'proposal.v2.docx'))).toBe(
      `${DOCUMENTS_DIR}/proposal-final.docx`,
    );
    expect(documentPath('notes', new Blob(['x']))).toBe(`${DOCUMENTS_DIR}/notes`);
  });

  it('reads manifests defensively', async () => {
    const missing = new JSZip();
    expect(await readManifest(missing)).toBeNull();

    const invalid = new JSZip();
    invalid.file(MANIFEST_FILE, '{not json');
    expect(await readManifest(invalid)).toBeNull();
  });

  it('rehydrates the first document matching a base name', async () => {
    const zip = new JSZip();
    zip.file(`${DOCUMENTS_DIR}/cv-alice.pdf`, 'pdf contents');

    const file = await readDocumentFromZip(zip, 'cv-alice');

    expect(file).not.toBeNull();
    expect(file!.name).toBe('cv-alice.pdf');
    expect(await file!.text()).toBe('pdf contents');
  });
});
