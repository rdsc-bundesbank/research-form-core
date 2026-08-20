import React, { useId, useRef, useState } from 'react';
import { Button, Card } from 'react-bootstrap';

export interface DocumentCertification {
  message: string;
}

export interface DocumentSpec {
  id: string;
  /** Label / heading for the document (string or rich node). */
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Allowed file extensions (without dot), e.g. ['pdf','docx']. */
  expectedExtensions?: string[];
  /** Must be confirmed (window.confirm) before the file is accepted. */
  certifications?: DocumentCertification[];
}

export interface DocumentUploadCardProps {
  documents: DocumentSpec[];
  /** Currently selected file per document id. */
  value: Record<string, File | null>;
  onChange: (id: string, file: File | null) => void;
  /** Document ids that are required but still missing (drives the error styling). */
  missingIds?: string[];
  header?: React.ReactNode;
}

const formatAllowedExtensions = (extensions?: string[]): string =>
  !extensions || extensions.length === 0
    ? 'any file type'
    : extensions.map((e) => e.toUpperCase()).join(', ');

const normalizeExtension = (filename: string): string | null => {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : null;
};

const isAllowedExtension = (file: File, expected?: string[]): boolean => {
  if (!expected || expected.length === 0) return true;
  const ext = normalizeExtension(file.name);
  return !!ext && expected.map((e) => e.toLowerCase()).includes(ext);
};

const confirmCertifications = (doc: DocumentSpec, file: File): boolean => {
  if (!doc.certifications || doc.certifications.length === 0) return true;
  const text = doc.certifications.map((c) => `- ${c.message}`).join('\n');
  return window.confirm(
    `Before uploading "${file.name}", please certify:\n\n${text}\n\nSelect OK to certify and continue, or Cancel to abort.`,
  );
};

const DocumentUploadRow: React.FC<{
  doc: DocumentSpec;
  file: File | null;
  hasError: boolean;
  onChange: (file: File | null) => void;
}> = ({ doc, file, hasError, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) {
      onChange(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    const first = list[0];
    if (!isAllowedExtension(first, doc.expectedExtensions)) {
      window.alert(
        `"${first.name}" does not match the allowed types: ${formatAllowedExtensions(doc.expectedExtensions)}.`,
      );
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (!confirmCertifications(doc, first)) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    onChange(first);
    if (inputRef.current) inputRef.current.value = '';
  };

  const accept = doc.expectedExtensions?.map((e) => `.${e.toLowerCase()}`).join(',');
  const borderClass = isDragging
    ? 'border-primary'
    : hasError
      ? 'border-danger'
      : 'border-secondary-subtle';
  const icon = file ? '✅' : hasError ? '❌' : '⬇️';
  const iconClass = file ? 'text-success fw-bold' : hasError ? 'text-danger fw-bold' : 'text-muted fw-bold';

  return (
    <li className="mb-3" id={`field-attachmentFiles-${doc.id}`}>
      <div className="fw-semibold mb-2">{doc.label}</div>
      {doc.description && <div className="small text-muted mb-2">{doc.description}</div>}
      <div
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false);
        }}
        className={`rounded-3 p-3 d-flex flex-column flex-lg-row gap-3 align-items-lg-center justify-content-between bg-light shadow-sm border border-2 ${borderClass}`}
        role="group"
        aria-labelledby={labelId}
      >
        <div className="d-flex align-items-start gap-3">
          <div
            className="rounded-circle bg-white border d-flex align-items-center justify-content-center"
            style={{ width: '2.75rem', height: '2.75rem', flex: '0 0 2.75rem' }}
          >
            <span className={iconClass} aria-hidden="true">
              {icon}
            </span>
          </div>
          <div>
            <div className="fw-semibold">
              {file ? 'File uploaded' : 'Drag and drop your file here'}
            </div>
            <div className="small text-muted">
              Accepted: {formatAllowedExtensions(doc.expectedExtensions)}
            </div>
            {file && (
              <div className="small mt-2 text-success">
                Selected file: <strong>{file.name}</strong>
              </div>
            )}
            {!file && hasError && (
              <div className="small mt-2 text-danger fw-bold">
                A file must be uploaded here before you can submit.
              </div>
            )}
          </div>
        </div>
        <div className="d-flex flex-column align-items-stretch align-items-lg-end gap-2">
          <Button
            type="button"
            variant={file ? 'success' : hasError ? 'danger' : 'primary'}
            onClick={() => inputRef.current?.click()}
          >
            <i className={`bi ${file ? 'bi-arrow-repeat' : 'bi-upload'} me-1`} />
            {file ? 'Replace file' : 'Choose file'}
          </Button>
          <input
            id={labelId}
            ref={inputRef}
            type="file"
            accept={accept}
            className="visually-hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>
    </li>
  );
};

/**
 * A reusable drag-and-drop document upload card. Controlled: the parent owns the
 * File map (files aren't part of react-hook-form state). Institution content is
 * entirely in `documents`.
 */
export const DocumentUploadCard: React.FC<DocumentUploadCardProps> = ({
  documents,
  value,
  onChange,
  missingIds = [],
  header = 'Required documents',
}) => {
  if (documents.length === 0) return null;
  const missing = new Set(missingIds);
  return (
    <Card className="mb-3">
      <Card.Header>{header}</Card.Header>
      <Card.Body>
        <ul className="list-unstyled mb-0">
          {documents.map((doc) => (
            <DocumentUploadRow
              key={doc.id}
              doc={doc}
              file={value[doc.id] ?? null}
              hasError={missing.has(doc.id)}
              onChange={(file) => onChange(doc.id, file)}
            />
          ))}
        </ul>
      </Card.Body>
    </Card>
  );
};
