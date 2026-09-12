import type { GraphNodeResponse, GraphRelationKind } from "../data/graph";
import type { Attribute, IfcNode, Position } from "./interfaces";

const relationDisplayName = (kind: GraphRelationKind, label: string) =>
  kind === "child" || kind === "inherits" ? `${kind}: ${label}` : label;
const relationName = (kind: GraphRelationKind, label: string) =>
  JSON.stringify(["relation", kind, label]);

/** Adapts one graph expansion to the canvas's temporary legacy node shape. */
export function graphResponseToIfcNode(
  response: GraphNodeResponse,
  position: Position = { x: 40, y: 60 },
): IfcNode {
  const attributes: Attribute[] = response.node.attributes.map((attribute, index) => ({
    name: JSON.stringify(["attribute", index, attribute.name]),
    displayName: attribute.name,
    content: { type: "value", value: attribute.value },
    inverse: false,
    edgePosition: { x: 0, y: 0 },
  }));
  const grouped = new Map<string, Attribute>();
  let reference: Attribute | null = null;

  for (const relation of response.relations) {
    if (relation.sourceId !== response.node.id) continue;
    if (relation.kind === "reference") {
      reference ??= {
        name: "Reference",
        content: { type: "id", value: [] },
        inverse: true,
        edgePosition: { x: 0, y: 0 },
      };
      (reference.content.value as string[]).push(relation.targetId);
      continue;
    }
    const name = relationName(relation.kind, relation.label);
    let attribute = grouped.get(name);
    if (!attribute) {
      attribute = {
        name,
        displayName: relationDisplayName(relation.kind, relation.label),
        content: { type: "id", value: [] },
        inverse: relation.kind === "inverse",
        edgePosition: { x: 0, y: 0 },
      };
      grouped.set(name, attribute);
      attributes.push(attribute);
    }
    (attribute.content.value as string[]).push(relation.targetId);
  }

  return {
    id: response.node.id,
    type: response.node.header.primary,
    secondary: response.node.header.secondary,
    reference,
    attributes,
    position,
  };
}
