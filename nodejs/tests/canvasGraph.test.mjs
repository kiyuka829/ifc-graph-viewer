import assert from "node:assert/strict";
import { test } from "node:test";
import { groupRelations, relationPortId } from "../src/components/utils.ts";

test("groups canvas ports by relation field while keeping references in the header", () => {
  const relations = [
    { id: "a", sourceId: "1", targetId: "2", kind: "attribute", label: "Items" },
    { id: "b", sourceId: "1", targetId: "3", kind: "attribute", label: "Items" },
    { id: "c", sourceId: "1", targetId: "4", kind: "inverse", label: "Items" },
    { id: "d", sourceId: "1", targetId: "5", kind: "reference", label: "references" },
  ];

  const groups = groupRelations(relations);

  assert.deepEqual(
    groups.map((group) => group.map(({ id }) => id)),
    [["a", "b"], ["c"], ["d"]],
  );
  assert.equal(relationPortId(relations[0]), relationPortId(relations[1]));
  assert.equal(relationPortId(relations[3]), "reference");
});
