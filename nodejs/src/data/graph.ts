/** Format-independent data consumed by the graph viewer. */
export type NodeId = string;

export interface NodeHeader {
  primary?: string;
  secondary?: string;
}

export interface LinkEndpoint {
  attribute: string;
  index: number;
}

export interface ViewLink {
  nodeId: NodeId;
  /** Edge label, used by IFCX children and inheritance links. */
  label?: string;
  /** Matching endpoint on nodeId, when the source format provides it. */
  endpoint?: LinkEndpoint;
}

export type ViewAttribute =
  | { name: string; value: unknown }
  | {
      name: string;
      direction: "outgoing" | "incoming";
      links: ViewLink[];
      missingNodeIds?: NodeId[];
    };

export const isLinkAttribute = (
  attribute: ViewAttribute,
): attribute is Extract<ViewAttribute, { links: ViewLink[] }> => "links" in attribute;

export interface ViewNode {
  id: NodeId;
  header: NodeHeader;
  attributes: ViewAttribute[];
  /** Generic reverse references displayed on the top-left port. */
  incoming: ViewLink[];
}
