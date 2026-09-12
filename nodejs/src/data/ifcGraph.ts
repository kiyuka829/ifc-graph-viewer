import { relationId } from "./graph.ts";
import type {
  GraphNodeResponse,
  GraphRelation,
  GraphRelationKind,
  NodeId,
} from "./graph.ts";

type LegacyContent = { type: string; value: unknown };
type LegacyAttribute = {
  name: string;
  content: LegacyContent;
  inverse: boolean;
};

/** The IFC-shaped node payload shared by the Python and web-ifc adapters. */
export interface LegacyIfcNode {
  id: string | number;
  type: string;
  attributes: LegacyAttribute[];
  references: LegacyAttribute;
}

const nodeId = (value: unknown): NodeId => String(value);

function relationIds(value: unknown): NodeId[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((id) => {
    if (id === null) return [];
    if (typeof id === "string" || typeof id === "number") return [nodeId(id)];
    throw new TypeError("IFC relation IDs must be strings or numbers.");
  });
}

/** Converts an adapter's existing IFC node response without any UI state. */
export function ifcNodeToGraph(node: LegacyIfcNode): GraphNodeResponse {
  const sourceId = nodeId(node.id);
  const relations: GraphRelation[] = [];
  const occurrences = new Map<string, number>();
  const addRelations = (attribute: LegacyAttribute, kind: GraphRelationKind) => {
    for (const targetId of relationIds(attribute.content.value)) {
      const key = JSON.stringify([sourceId, kind, attribute.name, targetId]);
      const index = occurrences.get(key) ?? 0;
      occurrences.set(key, index + 1);
      relations.push({
        id: relationId(sourceId, kind, attribute.name, targetId, index),
        sourceId,
        targetId,
        kind,
        label: attribute.name,
      });
    }
  };
  const attributes = node.attributes.flatMap((attribute) => {
    if (attribute.content.type === "id") {
      addRelations(attribute, attribute.inverse ? "inverse" : "attribute");
      return [];
    }
    return [{ name: attribute.name, value: attribute.content.value }];
  });
  if (node.references.content.type === "id") addRelations(node.references, "reference");
  else
    attributes.push({
      name: node.references.name,
      value: node.references.content.value,
    });

  return {
    node: {
      id: sourceId,
      header: { primary: node.type, secondary: `#${sourceId}` },
      attributes,
      relationIds: relations.map((relation) => relation.id),
    },
    relations,
  };
}
