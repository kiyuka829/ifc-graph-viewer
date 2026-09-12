import assert from "node:assert/strict";
import { test } from "node:test";
import { graphResponseToIfcNode } from "../src/components/graphCompatibility.ts";

test("adapts graph nodes for the legacy canvas without losing relation direction", () => {
  const node = graphResponseToIfcNode({
    node: {
      id: "wall",
      header: { primary: "IfcWall", secondary: "#42" },
      attributes: [
        { name: "Null", value: null },
        { name: '["relation","child","Links"]', value: "literal" },
      ],
      relationIds: [],
    },
    relations: [
      { id: "a", sourceId: "wall", targetId: "a", kind: "attribute", label: "Links" },
      { id: "b", sourceId: "wall", targetId: "b", kind: "attribute", label: "Links" },
      { id: "c", sourceId: "wall", targetId: "c", kind: "inverse", label: "Links" },
      { id: "d", sourceId: "wall", targetId: "d", kind: "child", label: "Links" },
      { id: "e", sourceId: "wall", targetId: "e", kind: "inherits", label: "Links" },
      { id: "f", sourceId: "wall", targetId: "f", kind: "reference", label: "ref" },
      { id: "g", sourceId: "wall", targetId: "g", kind: "reference", label: "ref" },
      {
        id: "elsewhere",
        sourceId: "other",
        targetId: "x",
        kind: "attribute",
        label: "Ignored",
      },
    ],
  });

  assert.equal(node.id, "wall");
  assert.equal(node.type, "IfcWall");
  assert.equal(node.secondary, "#42");
  assert.deepEqual(
    node.attributes.map(({ name, displayName, content, inverse }) => ({
      name,
      displayName,
      content,
      inverse,
    })),
    [
      {
        name: '["attribute",0,"Null"]',
        displayName: "Null",
        content: { type: "value", value: null },
        inverse: false,
      },
      {
        name: '["attribute",1,"[\\"relation\\",\\"child\\",\\"Links\\"]"]',
        displayName: '["relation","child","Links"]',
        content: { type: "value", value: "literal" },
        inverse: false,
      },
      {
        name: '["relation","attribute","Links"]',
        displayName: "Links",
        content: { type: "id", value: ["a", "b"] },
        inverse: false,
      },
      {
        name: '["relation","inverse","Links"]',
        displayName: "Links",
        content: { type: "id", value: ["c"] },
        inverse: true,
      },
      {
        name: '["relation","child","Links"]',
        displayName: "child: Links",
        content: { type: "id", value: ["d"] },
        inverse: false,
      },
      {
        name: '["relation","inherits","Links"]',
        displayName: "inherits: Links",
        content: { type: "id", value: ["e"] },
        inverse: false,
      },
    ],
  );
  assert.deepEqual(node.reference?.content, { type: "id", value: ["f", "g"] });
  assert.equal(node.reference?.inverse, true);
});
