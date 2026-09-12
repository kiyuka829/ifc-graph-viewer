import type { GraphRelation } from "../data/graph";

export const hasValue = (value: unknown): boolean =>
  Array.isArray(value) ? value.length > 0 : value != null;

export const relationPortId = (relation: GraphRelation): string =>
  relation.kind === "reference" ? "reference" : relation.id;
