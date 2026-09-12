import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { ifcNodeToGraph } from "../src/data/ifcGraph.ts";
import { relationId } from "../src/data/graph.ts";

test("converts IFC values and relations without losing occurrence or direction", () => {
  const graph = ifcNodeToGraph({
    id: 12,
    type: "IfcWall",
    attributes: [
      { name: "Name", content: { type: "value", value: "Wall" }, inverse: false },
      { name: "NullValue", content: { type: "value", value: null }, inverse: false },
      { name: "Points", content: { type: "id", value: [3, "3", 4] }, inverse: false },
      { name: "IsDefinedBy", content: { type: "id", value: [25] }, inverse: true },
      { name: "Tags", content: { type: "value", value: [] }, inverse: false },
    ],
    references: {
      name: "references",
      content: { type: "id", value: [1] },
      inverse: true,
    },
  });

  assert.deepEqual(graph.node, {
    id: "12",
    header: { primary: "IfcWall", secondary: "#12" },
    attributes: [
      { name: "Name", value: "Wall" },
      { name: "NullValue", value: null },
      { name: "Tags", value: [] },
    ],
    relationIds: [
      '["12","attribute","Points","3",0]',
      '["12","attribute","Points","3",1]',
      '["12","attribute","Points","4",0]',
      '["12","inverse","IsDefinedBy","25",0]',
      '["12","reference","references","1",0]',
    ],
  });
  assert.deepEqual(graph.relations, [
    {
      id: '["12","attribute","Points","3",0]',
      sourceId: "12",
      targetId: "3",
      kind: "attribute",
      label: "Points",
    },
    {
      id: '["12","attribute","Points","3",1]',
      sourceId: "12",
      targetId: "3",
      kind: "attribute",
      label: "Points",
    },
    {
      id: '["12","attribute","Points","4",0]',
      sourceId: "12",
      targetId: "4",
      kind: "attribute",
      label: "Points",
    },
    {
      id: '["12","inverse","IsDefinedBy","25",0]',
      sourceId: "12",
      targetId: "25",
      kind: "inverse",
      label: "IsDefinedBy",
    },
    {
      id: '["12","reference","references","1",0]',
      sourceId: "12",
      targetId: "1",
      kind: "reference",
      label: "references",
    },
  ]);
});

test("keeps non-reference payloads as attributes", () => {
  const graph = ifcNodeToGraph({
    id: "wall-a",
    type: "IfcWall",
    attributes: [
      { name: "Count", content: { type: "value", value: 2 }, inverse: false },
      {
        name: "Flags",
        content: { type: "value", value: [true, false] },
        inverse: false,
      },
    ],
    references: {
      name: "references",
      content: { type: "value", value: null },
      inverse: true,
    },
  });

  assert.deepEqual(graph.node.attributes, [
    { name: "Count", value: 2 },
    { name: "Flags", value: [true, false] },
    { name: "references", value: null },
  ]);
  assert.deepEqual(graph.relations, []);
});

test("rejects malformed reference IDs while ignoring null IDs", () => {
  const withNull = ifcNodeToGraph({
    id: 1,
    type: "IfcProject",
    attributes: [
      {
        name: "Malformed",
        content: { type: "id", value: [2, null] },
        inverse: false,
      },
    ],
    references: {
      name: "references",
      content: { type: "id", value: null },
      inverse: true,
    },
  });

  assert.deepEqual(withNull.relations, [
    {
      id: '["1","attribute","Malformed","2",0]',
      sourceId: "1",
      targetId: "2",
      kind: "attribute",
      label: "Malformed",
    },
  ]);
  assert.throws(
    () =>
      ifcNodeToGraph({
        ...withNull.node,
        type: "IfcProject",
        attributes: [
          {
            name: "Malformed",
            content: { type: "id", value: false },
            inverse: false,
          },
        ],
        references: {
          name: "references",
          content: { type: "id", value: null },
          inverse: true,
        },
      }),
    /IFC relation IDs must be strings or numbers/,
  );
});

test("relation IDs encode tuple fields without separator collisions", () => {
  assert.equal(
    relationId("source", "attribute", "a,b", "target", 2),
    '["source","attribute","a,b","target",2]',
  );
  assert.notEqual(
    relationId("source", "attribute", "a,b", "target", 0),
    relationId("source,a", "attribute", "b", "target", 0),
  );
});

test("converts repeated and incoming references from the IFC fixture", async () => {
  const fixture = JSON.parse(
    await readFile(new URL("fixtures/ifc4.expected.json", import.meta.url)),
  );
  const polyline = ifcNodeToGraph(fixture.find((node) => node.id === 13));
  const point = ifcNodeToGraph(fixture.find((node) => node.id === 2));

  assert.deepEqual(polyline.relations, [
    {
      id: '["13","attribute","Points","2",0]',
      sourceId: "13",
      targetId: "2",
      kind: "attribute",
      label: "Points",
    },
    {
      id: '["13","attribute","Points","2",1]',
      sourceId: "13",
      targetId: "2",
      kind: "attribute",
      label: "Points",
    },
  ]);
  assert.deepEqual(point.relations, [
    {
      id: '["2","reference","references","13",0]',
      sourceId: "2",
      targetId: "13",
      kind: "reference",
      label: "references",
    },
    {
      id: '["2","reference","references","3",0]',
      sourceId: "2",
      targetId: "3",
      kind: "reference",
      label: "references",
    },
  ]);
});
