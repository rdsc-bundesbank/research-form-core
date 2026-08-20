import React from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { useForm, FormProvider, type Resolver } from 'react-hook-form';
import { FlatFormRenderer } from './flatFormRenderer';
import type { FieldDef } from './flatFormSchema';

export interface ModalFormEditorProps<T extends Record<string, any>> {
  show: boolean;
  title: React.ReactNode;
  /** The flat field schema rendered inside the modal. */
  fields: FieldDef[];
  /** Default values for a new (or reset) item. */
  defaultValues: T;
  /** When editing, the existing item to pre-fill. */
  initial?: T | null;
  /** Optional react-hook-form resolver (e.g. zodResolver(schema)). */
  resolver?: Resolver<any>;
  onSave: (data: T) => void;
  onCancel: () => void;
  size?: 'sm' | 'lg' | 'xl';
  saveLabel?: string;
  cancelLabel?: string;
}

/**
 * A reusable modal that edits a single item with its own form. Institution
 * content is injected via `fields` (+ an optional `resolver`); the engine keeps
 * no knowledge of what is being edited. Used for funding organisations,
 * additional data sources, dataset parts, etc.
 */
export function ModalFormEditor<T extends Record<string, any>>({
  show,
  title,
  fields,
  defaultValues,
  initial,
  resolver,
  onSave,
  onCancel,
  size = 'lg',
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
}: ModalFormEditorProps<T>) {
  const methods = useForm<any>({ resolver, defaultValues: (initial ?? defaultValues) as any });
  const { handleSubmit, reset } = methods;

  React.useEffect(() => {
    if (show) reset((initial ?? defaultValues) as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, initial]);

  return (
    <Modal show={show} onHide={onCancel} size={size} backdrop="static">
      <FormProvider {...methods}>
        <Form onSubmit={handleSubmit((data) => onSave(data as T))}>
          <Modal.Header closeButton>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <FlatFormRenderer fields={fields} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={onCancel}>
              <i className="bi bi-x-lg me-1" />
              {cancelLabel}
            </Button>
            <Button type="submit" variant="primary">
              <i className="bi bi-check-lg me-1" />
              {saveLabel}
            </Button>
          </Modal.Footer>
        </Form>
      </FormProvider>
    </Modal>
  );
}
