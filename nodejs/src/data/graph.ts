/** Format-independent data for expanding a model node into a graph. */
export type NodeId = string;

export interface NodeHeader {
  primary?: string;
  secondary?: string;
}

export type GraphAttribute =
  { name: string; value: unknown } | { name: string; relationIds: string[] };

export const isRelationAttribute = (
  attribute: GraphAttribute,
): attribute is Extract<GraphAttribute, { relationIds: string[] }> =>
  "relationIds" in attribute;

export type GraphRelationKind =
  "attribute" | "inverse" | "reference" | "child" | "inherits";

/**
 * sourceId owns the expanded field and targetId is its referenced node.
 * inverse and reference relations retain that ownership while indicating the
 * reverse displayed direction through their kind.
 */
export interface GraphRelation {
  id: string;
  sourceId: NodeId;
  targetId: NodeId;
  kind: GraphRelationKind;
  label: string;
}

export function relationId(
  sourceId: NodeId,
  kind: GraphRelationKind,
  label: string,
  targetId: NodeId,
  occurrence = 0,
): string {
  return JSON.stringify([sourceId, kind, label, targetId, occurrence]);
}

export interface GraphNode {
  id: NodeId;
  header: NodeHeader;
  attributes: GraphAttribute[];
  /** Relations whose sourceId is this node ID, in expansion order. */
  relationIds: string[];
}

/** The graph data returned when a single source node is expanded. */
export interface GraphNodeResponse {
  node: GraphNode;
  relations: GraphRelation[];
}
