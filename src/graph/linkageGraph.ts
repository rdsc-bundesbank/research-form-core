import type { Dataset, Identifier } from '../data/datasetTypes';
import type { DatasetSelection } from '../data/datasetTable';

/** Minimal shape of an additional data source needed to build the graph. */
export interface AdditionalDataLike {
  source_name?: string;
  identifier_variables?: (Identifier | string)[];
}

/** Undirected identifier pairs that can be linked via record-linkage mappings. */
export type IdentifierMappings = [Identifier | string, Identifier | string][];

/**
 * Edge type for the linkage graph.
 * - "direct" means two datasets share at least one identifier.
 * - "indirect" means they can be linked via a mapping defined in mapping.json.
 */
export type LinkageEdgeType = 'direct' | 'indirect';

export interface LinkageNode {
  /** Unique ID of the node, currently the dataset abbreviation or additional data label. */
  id: string;
  /** Human readable label. */
  label: string;
  /** Whether this node corresponds to own or external datasets. */
  kind: 'dataset' | 'additional';
}

export interface LinkageEdge {
  id: string;
  source: string;
  target: string;
  type: LinkageEdgeType;
  /** For direct edges: shared identifiers. */
  via: string[];
  /** For indirect edges: identifier pairs that justify this edge. */
  viaPairs?: [string, string][];
}

export interface LinkageGraph {
  nodes: LinkageNode[];
  edges: LinkageEdge[];
}

export interface LinkageConnectivityInfo {
  /** IDs of nodes that have no linkage to any other node. */
  isolatedNodeIds: string[];
  /** IDs of nodes that are only connected via indirect edges (no direct shared identifier). */
  indirectOnlyNodeIds: string[];
  /** Triples [X, Y, Z] where X and Z are not directly linked but are connected through Y. */
  throughLinkTriples: [string, string, string][];
}

export interface LinkageGraphWithConnectivity extends LinkageGraph, LinkageConnectivityInfo {}

/**
 * Find identifier pairs that have an explicit record-linkage mapping.
 *
 * Mapping entries are treated as undirected, but not transitive. If A is mapped to B and B is mapped
 * to C, this function reports A-B and B-C links only. A-C must be represented by its own mapping
 * entry to avoid displaying a dataset-to-dataset edge that is only possible through another dataset.
 */
function findMappedIdentifierPairs(
  sourceIdentifiers: Set<Identifier | string>,
  targetIdentifiers: Set<Identifier | string>,
  identifierMappings: IdentifierMappings,
): [string, string][] {
  const viaPairs: [string, string][] = [];
  const seenPairs = new Set<string>();

  identifierMappings.forEach(([sourceMappingId, targetMappingId]) => {
    const sourceHasLeft = sourceIdentifiers.has(sourceMappingId);
    const sourceHasRight = sourceIdentifiers.has(targetMappingId);
    const targetHasLeft = targetIdentifiers.has(sourceMappingId);
    const targetHasRight = targetIdentifiers.has(targetMappingId);

    if (sourceHasLeft && targetHasRight) {
      addMappedIdentifierPair(viaPairs, seenPairs, sourceMappingId, targetMappingId);
    }

    if (sourceHasRight && targetHasLeft) {
      addMappedIdentifierPair(viaPairs, seenPairs, targetMappingId, sourceMappingId);
    }
  });

  return viaPairs;
}

/**
 * Add a mapped identifier pair once while preserving source-to-target orientation for tooltips.
 */
function addMappedIdentifierPair(
  viaPairs: [string, string][],
  seenPairs: Set<string>,
  sourceIdentifier: Identifier | string,
  targetIdentifier: Identifier | string,
): void {
  const pair: [string, string] = [String(sourceIdentifier), String(targetIdentifier)];
  const key = pair.join('\0');

  if (!seenPairs.has(key)) {
    seenPairs.add(key);
    viaPairs.push(pair);
  }
}

interface DatasetLike {
  id: string;
  label: string;
  identifiers: (Identifier | string)[];
}

function normaliseSelection(
  selection: (DatasetSelection & { dataset: Dataset })[],
): DatasetLike[] {
  return selection.map((sel) => ({
    id: sel.dataset.abbreviation,
    label: `${sel.dataset.abbreviation} – ${sel.dataset.name}`,
    identifiers: sel.dataset.identifiers ?? [],
  }));
}

function normaliseAdditionalData(additional: AdditionalDataLike[] | undefined): DatasetLike[] {
  if (!additional) return [];
  return additional.map((ad, idx) => ({
    id: `additional-${idx}`,
    label: ad.source_name || `Additional data ${idx + 1}`,
    identifiers: (ad.identifier_variables as (Identifier | string)[] | undefined) ?? [],
  }));
}

/**
 * Build a linkage graph for the selected datasets and additional data.
 */
export function buildLinkageGraph(
  datasetSelection: (DatasetSelection & { dataset: Dataset })[],
  additionalData: AdditionalDataLike[] | undefined,
  identifierMappings: IdentifierMappings,
): LinkageGraphWithConnectivity {
  const datasetNodes = normaliseSelection(datasetSelection);
  const additionalNodes = normaliseAdditionalData(additionalData);
  const allNodes: DatasetLike[] = [...datasetNodes, ...additionalNodes];

  const nodes: LinkageNode[] = [
    ...datasetNodes.map((d) => ({ id: d.id, label: d.label, kind: 'dataset' as const })),
    ...additionalNodes.map((a) => ({ id: a.id, label: a.label, kind: 'additional' as const })),
  ];

  const edges: LinkageEdge[] = [];
  const degree = new Map<string, number>();
  const hasDirectEdge = new Map<string, boolean>();
  nodes.forEach((n) => {
    degree.set(n.id, 0);
    hasDirectEdge.set(n.id, false);
  });

  for (let i = 0; i < allNodes.length; i += 1) {
    for (let j = i + 1; j < allNodes.length; j += 1) {
      const a = allNodes[i];
      const b = allNodes[j];

      const aIds = new Set(a.identifiers);
      const bIds = new Set(b.identifiers);

      const shared = [...aIds].filter((id) => bIds.has(id));
      if (shared.length > 0) {
        const viaPairs: [string, string][] = shared.map((id) => [String(id), String(id)]);
        edges.push({
          id: `edge-${a.id}-${b.id}-direct`,
          source: a.id,
          target: b.id,
          type: 'direct',
          via: shared.map(String),
          viaPairs,
        });
        degree.set(a.id, (degree.get(a.id) ?? 0) + 1);
        degree.set(b.id, (degree.get(b.id) ?? 0) + 1);
        hasDirectEdge.set(a.id, true);
        hasDirectEdge.set(b.id, true);
        continue;
      }

      const viaPairs = findMappedIdentifierPairs(aIds, bIds, identifierMappings);

      if (viaPairs.length > 0) {
        edges.push({
          id: `edge-${a.id}-${b.id}-indirect`,
          source: a.id,
          target: b.id,
          type: 'indirect',
          via: [],
          viaPairs,
        });
        degree.set(a.id, (degree.get(a.id) ?? 0) + 1);
        degree.set(b.id, (degree.get(b.id) ?? 0) + 1);
      }
    }
  }

  const isolatedNodeIds = nodes
    .map((n) => n.id)
    .filter((id) => (degree.get(id) ?? 0) === 0);

  const indirectOnlyNodeIds = nodes
    .map((n) => n.id)
    .filter((id) => (degree.get(id) ?? 0) > 0 && hasDirectEdge.get(id) === false);

  // Compute triples X-Y-Z where X and Z are connected only via an intermediate Y (path length 2)
  const adjacencyByDataset = new Map<string, { direct: Set<string>; indirect: Set<string> }>();
  nodes.forEach((n) => {
    adjacencyByDataset.set(n.id, { direct: new Set(), indirect: new Set() });
  });

  edges.forEach((e) => {
    const a = adjacencyByDataset.get(e.source);
    const b = adjacencyByDataset.get(e.target);
    if (!a || !b) return;
    if (e.type === 'direct') {
      a.direct.add(e.target);
      b.direct.add(e.source);
    } else {
      a.indirect.add(e.target);
      b.indirect.add(e.source);
    }
  });

  const throughLinkTriples: [string, string, string][] = [];

  nodes.forEach((y) => {
    const adjY = adjacencyByDataset.get(y.id);
    if (!adjY) return;
    const neighbours = new Set<string>([...adjY.direct, ...adjY.indirect]);
    const neighbourList = [...neighbours];

    for (let i = 0; i < neighbourList.length; i += 1) {
      for (let j = i + 1; j < neighbourList.length; j += 1) {
        const x = neighbourList[i];
        const z = neighbourList[j];

        const adjX = adjacencyByDataset.get(x);
        if (!adjX) continue;
        const xAll = new Set<string>([...adjX.direct, ...adjX.indirect]);

        if (!xAll.has(z)) {
          throughLinkTriples.push([x, y.id, z]);
        }
      }
    }
  });

  return { nodes, edges, isolatedNodeIds, indirectOnlyNodeIds, throughLinkTriples };
}
