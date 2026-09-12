import type { GraphRelation } from "../data/graph";

export const hasValue = (value: unknown): boolean =>
  Array.isArray(value) ? value.length > 0 : value != null;

export const relationPortId = (relation: GraphRelation): string =>
  relation.kind === "reference"
    ? "reference"
    : JSON.stringify([relation.kind, relation.label]);

export const groupRelations = (relations: GraphRelation[]): GraphRelation[][] => [
  ...relations
    .reduce((groups, relation) => {
      const id = relationPortId(relation);
      groups.set(id, [...(groups.get(id) ?? []), relation]);
      return groups;
    }, new Map<string, GraphRelation[]>())
    .values(),
];
