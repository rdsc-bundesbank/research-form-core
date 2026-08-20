/**
 * Validates a ContentPack at load so a centre's config typos surface immediately
 * instead of rendering wrong. Pure; returns a list of human-readable issues.
 */
import type { ContentPack } from './contentPack';

export interface ContentPackIssue {
  severity: 'error' | 'warning';
  message: string;
}

export function validateContentPack(pack: ContentPack): ContentPackIssue[] {
  const issues: ContentPackIssue[] = [];
  const err = (message: string) => issues.push({ severity: 'error', message });
  const warn = (message: string) => issues.push({ severity: 'warning', message });

  const identifierKeys = new Set(Object.keys(pack.identifierMetadata ?? {}));

  // Unique dataset abbreviations.
  const seen = new Set<string>();
  for (const d of pack.datasets ?? []) {
    if (seen.has(d.abbreviation)) err(`Duplicate dataset abbreviation "${d.abbreviation}".`);
    seen.add(d.abbreviation);

    // Every identifier a dataset references must have metadata.
    for (const id of d.identifiers ?? []) {
      if (!identifierKeys.has(id)) {
        err(`Dataset "${d.abbreviation}" references identifier "${id}" with no entry in identifierMetadata.`);
      }
    }

    // Duplicate part abbreviations within a dataset.
    const partSeen = new Set<string>();
    for (const p of d.parts ?? []) {
      if (partSeen.has(p.abbreviation)) {
        err(`Dataset "${d.abbreviation}" has duplicate part "${p.abbreviation}".`);
      }
      partSeen.add(p.abbreviation);
    }
  }

  // Identifier linkage pairs must reference known identifiers.
  for (const [a, b] of pack.identifierLinkages ?? []) {
    if (!identifierKeys.has(a)) warn(`Linkage references unknown identifier "${a}".`);
    if (!identifierKeys.has(b)) warn(`Linkage references unknown identifier "${b}".`);
  }

  // Unique mode ids; at least one mode.
  if (!pack.modes || pack.modes.length === 0) {
    err('ContentPack has no modes.');
  } else {
    const modeSeen = new Set<string>();
    for (const m of pack.modes) {
      if (modeSeen.has(m.id)) err(`Duplicate mode id "${m.id}".`);
      modeSeen.add(m.id);
    }
  }

  // Branding sanity.
  if (!pack.branding?.title) warn('ContentPack branding has no title.');

  // Provenance: appId stamps exports so foreign imports can be rejected.
  if (!pack.appId) warn('ContentPack has no appId; exported archives cannot be provenance-checked on import.');

  return issues;
}