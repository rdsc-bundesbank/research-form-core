import React, { useMemo, useState } from 'react';
import { Badge, Button, Card, Collapse, Form } from 'react-bootstrap';
import { useFormContext, useWatch } from 'react-hook-form';
import { FlatFormRenderer } from './flatFormRenderer';
import type { FieldDef } from './flatFormSchema';

export interface AuthorRoleConfig {
  /** Role key stored on the author, e.g. 'internal' | 'external'. */
  role: string;
  /** Human label, e.g. 'Internal researcher'. */
  label: string;
  /** Fields shown for an author of this role. */
  fields: FieldDef[] | ((index: number) => FieldDef[]);
  /** Blank author of this role (should include `role`). */
  defaultItem: Record<string, any>;
}

export interface AuthorsFieldProps {
  /** react-hook-form array field, e.g. 'authors'. */
  name: string;
  roles: AuthorRoleConfig[];
  /** Role given to newly added authors. Defaults to the first role. */
  defaultRole?: string;
  /**
   * When set to a pair of roles, each author card shows an internal/external
   * switch that toggles between them (mixed projects). The first role is the
   * "checked" state.
   */
  toggleRoles?: [string, string];
  /** Field storing the submitting author's index, e.g. 'submitting_author_index'. */
  submittingIndexName?: string;
  /** Minimum number of authors. Default 1. */
  minAuthors?: number;
  /** Show a "Project lead" badge on the first author. Default true. */
  showLeadBadge?: boolean;
  addLabel?: string;
  titleFor?: (author: any, index: number) => React.ReactNode;
  onChangeAuthors?: (next: any[], previous: any[]) => void;
}

const resolveFields = (name: string, fields: AuthorRoleConfig['fields'], index: number): FieldDef[] =>
  typeof fields === 'function' ? fields(index) : fields.map((f) => ({ ...f, name: `${name}.${index}.${f.name}` }));

const defaultTitle = (author: any, index: number) => {
  const name = [author?.first_name, author?.surname].filter(Boolean).join(' ').trim();
  return name || `Author ${index + 1}`;
};

const IconButton: React.FC<{
  icon: string;
  title: string;
  /** Muted grey by default; pass 'danger' for destructive actions. */
  tone?: 'secondary' | 'danger';
  onClick: () => void;
}> = ({ icon, title, tone = 'secondary', onClick }) => (
  <span
    role="button"
    className={`text-${tone} ms-2`}
    aria-label={title}
    title={title}
    onClick={onClick}
  >
    <i className={`bi ${icon} author-icon`} />
  </span>
);

/**
 * Reusable authors/researchers editor matching the reference design: one
 * collapsible card per author with role/lead/submitting badges, a per-author
 * internal/external toggle (mixed projects), reorder / set-submitting / remove
 * icon actions, and per-role fields rendered by FlatFormRenderer.
 */
export const AuthorsField: React.FC<AuthorsFieldProps> = ({
  name,
  roles,
  defaultRole,
  toggleRoles,
  submittingIndexName,
  minAuthors = 1,
  showLeadBadge = true,
  addLabel = 'Add researcher',
  titleFor = defaultTitle,
  onChangeAuthors,
}) => {
  const { control, setValue } = useFormContext();
  const authors: any[] = (useWatch({ control, name }) as any[]) ?? [];
  const watchedSubmitting = useWatch({ control, name: submittingIndexName ?? '__submitting_none__' });
  const submittingIndex = submittingIndexName ? ((watchedSubmitting as number) ?? 0) : undefined;

  const [open, setOpen] = useState<boolean[]>([]);
  const isOpen = (i: number) => open[i] ?? true;

  const roleByKey = useMemo(() => new Map(roles.map((r) => [r.role, r])), [roles]);
  const newRole = defaultRole ?? roles[0]?.role;

  const commitAuthors = (next: any[]) => {
    setValue(name as any, next as any, { shouldValidate: true, shouldDirty: true });
    onChangeAuthors?.(next, authors);
  };
  const setSubmitting = (i: number) =>
    submittingIndexName && setValue(submittingIndexName as any, i as any, { shouldValidate: true });

  const add = () => {
    const cfg = roleByKey.get(newRole);
    if (!cfg) return;
    commitAuthors([...authors, { ...cfg.defaultItem, role: newRole }]);
    setOpen((prev) => [...prev, true]);
    if (submittingIndexName && authors.length === 0) setSubmitting(0);
  };

  const remove = (i: number) => {
    if (authors.length <= minAuthors) return;
    commitAuthors(authors.filter((_, idx) => idx !== i));
    setOpen((prev) => prev.filter((_, idx) => idx !== i));
    if (submittingIndex != null) {
      if (submittingIndex === i) setSubmitting(Math.max(0, authors.length - 2));
      else if (submittingIndex > i) setSubmitting(submittingIndex - 1);
    }
  };

  const swap = (i: number, j: number) => {
    if (j < 0 || j >= authors.length) return;
    const next = [...authors];
    [next[i], next[j]] = [next[j], next[i]];
    commitAuthors(next);
    setOpen((prev) => {
      const n = [...prev];
      [n[i], n[j]] = [n[j] ?? true, n[i] ?? true];
      return n;
    });
    if (submittingIndex === i) setSubmitting(j);
    else if (submittingIndex === j) setSubmitting(i);
  };

  const toggleOpen = (i: number) =>
    setOpen((prev) => {
      const n = [...prev];
      n[i] = !isOpen(i);
      return n;
    });

  const changeRole = (i: number, role: string) => {
    const cfg = roleByKey.get(role);
    if (!cfg) return;
    const next = [...authors];
    next[i] = { ...cfg.defaultItem, ...authors[i], role };
    commitAuthors(next);
  };

  return (
    <div>
      {authors.map((author, i) => {
        const cfg = roleByKey.get(author?.role) ?? roles[0];
        const prefixedFields = resolveFields(name, cfg.fields, i);
        const isSubmitting = submittingIndex === i;

        return (
          <Card className="mb-3" key={i}>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <span className="fw-semibold">{titleFor(author, i)}</span>
                  {showLeadBadge && i === 0 && <Badge bg="primary">Project lead</Badge>}
                  {isSubmitting && (
                    <Badge bg="dark" text="light">
                      <i className="bi bi-person-fill me-1" />
                      Submitting author
                    </Badge>
                  )}
                  {toggleRoles && (
                    <Form.Check
                      type="switch"
                      id={`${name}-${i}-role-toggle`}
                      className="ms-2"
                      label={(roleByKey.get(author?.role) ?? cfg).label}
                      checked={author?.role === toggleRoles[0]}
                      onChange={(e) => changeRole(i, e.target.checked ? toggleRoles[0] : toggleRoles[1])}
                    />
                  )}
                </div>
                <div className="d-flex align-items-center">
                  {submittingIndexName && !isSubmitting && (
                    <IconButton icon="bi-star-fill" title="Set as submitting author" onClick={() => setSubmitting(i)} />
                  )}
                  <IconButton
                    icon={isOpen(i) ? 'bi-chevron-up' : 'bi-chevron-down'}
                    title={isOpen(i) ? 'Collapse' : 'Expand'}
                    onClick={() => toggleOpen(i)}
                  />
                  {i > 0 && <IconButton icon="bi-arrow-up" title="Move up" onClick={() => swap(i, i - 1)} />}
                  {i < authors.length - 1 && (
                    <IconButton icon="bi-arrow-down" title="Move down" onClick={() => swap(i, i + 1)} />
                  )}
                  {authors.length > minAuthors && (
                    <IconButton icon="bi-trash-fill" title="Remove author" tone="danger" onClick={() => remove(i)} />
                  )}
                </div>
              </div>
            </Card.Header>
            <Collapse in={isOpen(i)}>
              <div>
                <Card.Body>
                  <FlatFormRenderer fields={prefixedFields} />
                </Card.Body>
              </div>
            </Collapse>
          </Card>
        );
      })}

      <Button variant="primary" size="sm" onClick={add}>
        <i className="bi bi-plus-lg me-1" />
        {addLabel}
      </Button>
    </div>
  );
};
