import React, { useRef, useState } from 'react';
import { Button } from 'react-bootstrap';
import JSZip from 'jszip';
import { readManifest } from '../utils/applicationArchive';

/** Reads and parses application.json from an application ZIP, returning both. */
export async function readApplicationZip(
  file: File,
): Promise<{ application: unknown; zip: JSZip }> {
  const zip = await JSZip.loadAsync(file);
  const entry = zip.file('application.json');
  if (!entry) throw new Error('The ZIP file does not contain application.json.');
  const application = JSON.parse(await entry.async('text'));
  return { application, zip };
}

/** Import callback: receives the parsed application and the JSZip (for attachments). */
export type ApplicationImportHandler = (application: unknown, zip: JSZip) => void;

export interface ApplicationImportProps {
  onImport: ApplicationImportHandler;
  onError?: (message: string) => void;
  /**
   * When set, imports are accepted only if the archive's manifest.json declares
   * this appId. An export from a different tool (or a ZIP with no manifest) is
   * rejected via `onError` before `onImport` runs.
   */
  expectedAppId?: string;
  title?: React.ReactNode;
  hint?: React.ReactNode;
  buttonLabel?: string;
  className?: string;
}

/**
 * A drag-and-drop zone (plus a Choose-file button) to import an existing
 * application ZIP. Reads application.json and hands it — with the JSZip — to
 * `onImport`.
 */
export const ApplicationImport: React.FC<ApplicationImportProps> = ({
  onImport,
  onError,
  expectedAppId,
  title = 'Continue an existing application',
  hint = 'Drag an application ZIP here, or choose a file.',
  buttonLabel = 'Choose ZIP',
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    try {
      const { application, zip } = await readApplicationZip(file);
      if (expectedAppId) {
        const manifest = await readManifest(zip);
        if (!manifest?.appId) {
          onError?.(
            'This ZIP has no manifest.json, so it cannot be recognised as a valid application export.',
          );
          return;
        }
        if (manifest.appId !== expectedAppId) {
          onError?.(
            `This application was exported from a different tool ("${manifest.appId}") and cannot be imported here.`,
          );
          return;
        }
      }
      onImport(application, zip);
    } catch (err: any) {
      onError?.(String(err?.message ?? err));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div
      className={`rounded-3 p-3 d-flex flex-column flex-lg-row gap-3 align-items-lg-center justify-content-between border border-2 ${
        isDragging ? 'border-primary bg-light' : 'border-secondary-subtle'
      } ${className ?? ''}`}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        void handleFile(e.dataTransfer.files?.[0]);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false);
      }}
      role="group"
    >
      <div className="d-flex align-items-center gap-3">
        <i className="bi bi-file-earmark-zip fs-4 text-secondary" aria-hidden="true" />
        <div>
          <div className="fw-semibold">{title}</div>
          <div className="small text-muted">{hint}</div>
        </div>
      </div>
      <Button variant="outline-secondary" onClick={() => inputRef.current?.click()}>
        <i className="bi bi-upload me-1" />
        {buttonLabel}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        className="visually-hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
};
