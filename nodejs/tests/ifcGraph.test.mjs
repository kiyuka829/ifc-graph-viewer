import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { ifcNodeToViewNode } from "../src/data/ifcGraph.ts";

test("converts IFC values and node-local links without losing occurrence or direction", () => {
  const node = ifcNodeToViewNode({
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

  assert.deepEqual(node, {
    id: "12",
    header: { primary: "IfcWall", secondary: "#12" },
    attributes: [
      { name: "Name", value: "Wall" },
      { name: "NullValue", value: null },
      {
        name: "Points",
        direction: "outgoing",
        links: [{ nodeId: "3" }, { nodeId: "3" }, { nodeId: "4" }],
      },
      {
        name: "IsDefinedBy",
        direction: "incoming",
        links: [{ nodeId: "25" }],
      },
      { name: "Tags", value: [] },
    ],
    incoming: [{ nodeId: "1" }],
  });
});

test("keeps non-reference payloads as attributes", () => {
  const node = ifcNodeToViewNode({
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

  assert.deepEqual(node.attributes, [
    { name: "Count", value: 2 },
    { name: "Flags", value: [true, false] },
    { name: "references", value: null },
  ]);
  assert.deepEqual(node.incoming, []);
});

test("rejects malformed reference IDs while ignoring null IDs", () => {
  const input = {
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
  };
  assert.deepEqual(ifcNodeToViewNode(input).attributes[0].links, [{ nodeId: "2" }]);
  assert.throws(
    () =>
      ifcNodeToViewNode({
        ...input,
        attributes: [
          {
            name: "Malformed",
            content: { type: "id", value: false },
            inverse: false,
          },
        ],
      }),
    /IFC relation IDs must be strings or numbers/,
  );
});

test("converts repeated and generic incoming references from the IFC fixture", async () => {
  const fixture = JSON.parse(
    await readFile(new URL("fixtures/ifc4.expected.json", import.meta.url)),
  );
  const polyline = ifcNodeToViewNode(fixture.find((node) => node.id === 13));
  const point = ifcNodeToViewNode(fixture.find((node) => node.id === 2));

  assert.deepEqual(polyline.attributes.find((a) => a.name === "Points").links, [
    { nodeId: "2" },
    { nodeId: "2" },
  ]);
  assert.deepEqual(point.incoming, [{ nodeId: "13" }, { nodeId: "3" }]);
});
