import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useFormContext, useWatch, type Resolver } from 'react-hook-form';
import { ModalFormEditor } from './modalFormEditor';
import type { FieldDef } from './flatFormSchema';

export interface ModalListFieldProps<T extends Record<string, any>> {
  /** react-hook-form array field path, e.g. "funding_organisations". */
  name: string;
  addLabel?: string;
  modalTitle?: React.ReactNode;
  /** Fields rendered in the add/edit modal. */
  fields: FieldDef[];
  /** Blank item for "add". */
  defaultItem: T;
  resolver?: Resolver<any>;
  /** Renders a one-line (or richer) summary of an item in the list. */
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyText?: React.ReactNode;
  size?: 'sm' | 'lg' | 'xl';
}

/**
 * A reusable "list of items edited through a modal" control, bound to a
 * react-hook-form array field. Renders each item as a row with edit/remove
 * actions and an add button that opens {@link ModalFormEditor}. Institution
 * content is entirely in `fields`/`renderItem`.
 */
export function ModalListField<T extends Record<string, any>>({
  name,
  addLabel = 'Add',
  modalTitle,
  fields,
  defaultItem,
  resolver,
  renderItem,
  emptyText,
  size,
}: ModalListFieldProps<T>) {
  const { control, setValue } = useFormContext();
  const items: T[] = (useWatch({ control, name }) as T[]) ?? [];

  const [show, setShow] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const commit = (next: T[]) =>
    setValue(name as any, next as any, { shouldValidate: true, shouldDirty: true });

  const openAdd = () => {
    setEditingIndex(null);
    setShow(true);
  };
  const openEdit = (i: number) => {
    setEditingIndex(i);
    setShow(true);
  };
  const remove = (i: number) => commit(items.filter((_, idx) => idx !== i));
  const save = (data: T) => {
    commit(
      editingIndex === null
        ? [...items, data]
        : items.map((it, idx) => (idx === editingIndex ? data : it)),
    );
    setShow(false);
  };

  return (
    <div>
      {items.length === 0 && emptyText && (
        <p className="text-muted mb-2">{emptyText}</p>
      )}

      {items.map((item, i) => (
        <div
          key={i}
          className="border rounded p-3 mb-2 d-flex justify-content-between align-items-center"
        >
          <div className="me-3">{renderItem(item, i)}</div>
          <div className="text-nowrap">
            <span
              role="button"
              className="text-secondary ms-2"
              aria-label="Edit"
              title="Edit"
              onClick={() => openEdit(i)}
            >
              <i className="bi bi-pencil-fill" />
            </span>
            <span
              role="button"
              className="text-danger ms-2"
              aria-label="Remove"
              title="Remove"
              onClick={() => remove(i)}
            >
              <i className="bi bi-trash-fill" />
            </span>
          </div>
        </div>
      ))}

      <Button variant="primary" size="sm" onClick={openAdd}>
        <i className="bi bi-plus-lg me-1" />
        {addLabel}
      </Button>

      <ModalFormEditor<T>
        show={show}
        title={modalTitle ?? addLabel}
        fields={fields}
        defaultValues={defaultItem}
        initial={editingIndex === null ? null : items[editingIndex]}
        resolver={resolver}
        onSave={save}
        onCancel={() => setShow(false)}
        size={size}
      />
    </div>
  );
}