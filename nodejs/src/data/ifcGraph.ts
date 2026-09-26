import type { NodeId, ViewAttribute, ViewLink, ViewNode } from "./graph.ts";

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

function links(value: unknown): ViewLink[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((id) => {
    if (id === null) return [];
    if (typeof id === "string" || typeof id === "number")
      return [{ nodeId: nodeId(id) }];
    throw new TypeError("IFC relation IDs must be strings or numbers.");
  });
}

/** Converts an adapter's existing IFC node response without any UI state. */
export function ifcNodeToViewNode(node: LegacyIfcNode): ViewNode {
  const attributes: ViewAttribute[] = node.attributes.map((attribute) =>
    attribute.content.type === "id"
      ? {
          name: attribute.name,
          direction: attribute.inverse ? "incoming" : "outgoing",
          links: links(attribute.content.value),
        }
      : { name: attribute.name, value: attribute.content.value },
  );
  let incoming: ViewLink[] = [];
  if (node.references.content.type === "id")
    incoming = links(node.references.content.value);
  else
    attributes.push({
      name: node.references.name,
      value: node.references.content.value,
    });

  const id = nodeId(node.id);
  return {
    id,
    header: { primary: node.type, secondary: `#${id}` },
    attributes,
    incoming,
  };
}
