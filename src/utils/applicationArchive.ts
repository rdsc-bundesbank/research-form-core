/**
 * Application archive — the single, engine-owned format for the ZIP an applicant
 * downloads and later re-imports. Both consuming applications use this so their
 * archives are byte-for-byte identical in layout:
 *
 *   application.json          the machine-readable application
 *   manifest.json             provenance ({ appId, versions, createdAt })
 *   documents/<base><ext>     every supporting file, in one shared folder
 *
 * The manifest's `appId` lets an application refuse imports produced by a
 * different tool (see ApplicationImport's `expectedAppId`).
 */
import JSZip from 'jszip';

/** The single folder that holds every supporting file in an application ZIP. */
export const DOCUMENTS_DIR = 'documents';
/** Root entry names inside an application ZIP. */
export const APPLICATION_FILE = 'application.json';
export const MANIFEST_FILE = 'manifest.json';

/** A supporting file to place in the archive under `documents/<base><ext>`. */
export interface ArchiveDocument {
  /** Stable id of the document slot (not used for the filename). */
  id: string;
  /** Filename stem, without extension (e.g. "cv-jane-doe"). */
  base: string;
  /** The uploaded file. Its extension (from `File.name`) is preserved. */
  file: File | Blob;
}

/** Provenance stamped into every archive so foreign imports can be rejected. */
export interface ApplicationManifest {
  /** Which application produced this archive (from its ContentPack `appId`). */
  appId: string;
  appVersion?: string;
  coreVersion?: string;
  createdAt: string;
}

export interface BuildArchiveOptions {
  /** The producing application's id (ContentPack.appId). */
  appId: string;
  appVersion?: string;
  coreVersion?: string;
  /** Supporting files; each lands at `documents/<base><ext>`. */
  documents?: ArchiveDocument[];
}

/** Extract the extension (including the dot) from a filename, or '' if none. */
const extensionOf = (name: string): string => {
  const match = /\.[^./\\]+$/.exec(name);
  return match ? match[0] : '';
};

/** The archive path a document with the given base + file would occupy. */
export const documentPath = (base: string, file: File | Blob): string =>
  `${DOCUMENTS_DIR}/${base}${extensionOf((file as File).name ?? '')}`;

/**
 * Bundles the application, a provenance manifest and the supporting documents
 * into a single ZIP (the artefact an applicant submits). Returns a Blob.
 */
export async function buildApplicationZip(
  application: unknown,
  { appId, appVersion, coreVersion, documents = [] }: BuildArchiveOptions,
): Promise<Blob> {
  const zip = new JSZip();

  zip.file(APPLICATION_FILE, JSON.stringify(application, null, 2));

  const manifest: ApplicationManifest = {
    appId,
    ...(appVersion ? { appVersion } : {}),
    ...(coreVersion ? { coreVersion } : {}),
    createdAt: new Date().toISOString(),
  };
  zip.file(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

  for (const doc of documents) {
    if (!doc?.file) continue;
    zip.file(documentPath(doc.base, doc.file), await doc.file.arrayBuffer());
  }

  return zip.generateAsync({ type: 'blob' });
}

/** Reads and parses `manifest.json` from an application ZIP, or null if absent. */
export async function readManifest(zip: JSZip): Promise<ApplicationManifest | null> {
  const entry = zip.file(MANIFEST_FILE);
  if (!entry) return null;
  try {
    return JSON.parse(await entry.async('text')) as ApplicationManifest;
  } catch {
    return null;
  }
}

/**
 * Finds the supporting file stored under `documents/<base>.*` and returns it as
 * a File (name + type preserved), or null. Used to re-hydrate uploads on import.
 */
export async function readDocumentFromZip(zip: JSZip, base: string): Promise<File | null> {
  const prefix = `${DOCUMENTS_DIR}/${base}.`;
  const entry = Object.values(zip.files).find(
    (f) => !f.dir && f.name.replace(/\\/g, '/').startsWith(prefix),
  );
  if (!entry) return null;
  const blob = await entry.async('blob');
  const filename = entry.name.split('/').pop() ?? base;
  return new File([blob], filename, { type: blob.type });
}

/** Triggers a browser download of a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
