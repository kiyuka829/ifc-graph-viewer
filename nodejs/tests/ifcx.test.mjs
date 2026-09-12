import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { IfcxSource } from "../src/data/ifcx.ts";

const fixture = async (name) =>
  new File([await readFile(new URL(`fixtures/${name}`, import.meta.url))], name);
const document = (data) =>
  new File(
    [JSON.stringify({ header: { ifcxVersion: "ifcx-alpha" }, data })],
    "test.ifcx",
  );

test("composition returns graph nodes without mutating headers", async () => {
  const source = new IfcxSource();
  const model = await source.load([
    await fixture("base.ifcx"),
    await fixture("overlay.ifcx"),
  ]);
  assert.equal(model.root.id, "project");
  assert.deepEqual(model.root.header, { primary: "project" });
  assert.equal(model.headers.length, 2);
  assert.deepEqual(model.root.attributes, [
    {
      name: "wall",
      relationIds: ['["project","child","wall","wall",0]'],
    },
    {
      name: "__proto__",
      relationIds: ['["project","child","__proto__","__proto__",0]'],
    },
    { name: "label", value: "Merged" },
    { name: "nested::replacement", value: 42 },
  ]);
  const base = await new IfcxSource().load([await fixture("base.ifcx")]);
  assert.deepEqual(base.root.attributes.slice(3), [
    { name: "nested::flag", value: true },
    { name: "nested::empty", value: null },
    { name: "nested::array", value: [1, { x: 2 }] },
  ]);
  assert.deepEqual(model.searchData.IFCX.items, [
    { id: "__proto__", displayName: "__proto__" },
    { id: "project", displayName: "project" },
    { id: "second", displayName: "second" },
    { id: "wall", displayName: "wall" },
  ]);
  const wall = await source.getNode("", "wall");
  assert.deepEqual(wall.node.header, { primary: "wall" });
  assert.deepEqual(
    wall.relations.map(({ kind, label, targetId }) => ({ kind, label, targetId })),
    [
      { kind: "attribute", label: "parent", targetId: "project" },
      { kind: "attribute", label: "self", targetId: "wall" },
      { kind: "reference", label: "references", targetId: "project" },
      { kind: "reference", label: "references", targetId: "wall" },
      { kind: "reference", label: "references", targetId: "second" },
    ],
  );
  assert.deepEqual((await source.lookup("", "id", "__proto__")).items, [
    { id: "__proto__", displayName: "__proto__" },
  ]);
  assert.deepEqual((await source.lookup("", "id", "missing")).items, []);
});

test("relations retain labels, relation kinds, repeated targets, classes, and scalar values", async () => {
  const source = new IfcxSource();
  const model = await source.load([
    document([
      {
        path: "root",
        children: { first: "target", same: "target" },
        inherits: { same: "target" },
      },
      { path: "other", children: { second: "target" } },
      {
        path: "target",
        attributes: {
          "bsi::ifc::class": { code: "IfcWall" },
          self: "target",
          plain: "text",
          nested: { flag: true },
          array: [1, { x: 2 }],
        },
      },
    ]),
  ]);
  assert.deepEqual(model.searchData.IfcWall.items, [
    { id: "target", displayName: "target" },
  ]);
  assert.deepEqual((await source.getNode("", "target")).node.header, {
    primary: "target",
    secondary: "IfcWall",
  });
  const root = await source.getNode("", "root");
  assert.deepEqual(root.node.attributes, [
    {
      name: "first",
      relationIds: ['["root","child","first","target",0]'],
    },
    {
      name: "same",
      relationIds: ['["root","child","same","target",0]'],
    },
    {
      name: "same",
      relationIds: ['["root","inherits","same","target",0]'],
    },
  ]);
  assert.deepEqual(
    root.relations.map(({ kind, label, targetId }) => ({ kind, label, targetId })),
    [
      { kind: "child", label: "first", targetId: "target" },
      { kind: "child", label: "same", targetId: "target" },
      { kind: "inherits", label: "same", targetId: "target" },
    ],
  );
  assert.equal(new Set(root.relations.map((relation) => relation.id)).size, 3);
  const target = await source.getNode("", "target");
  assert.deepEqual(target.node.attributes, [
    { name: "bsi::ifc::class::code", value: "IfcWall" },
    {
      name: "self",
      relationIds: ['["target","attribute","self","target",0]'],
    },
    { name: "plain", value: "text" },
    { name: "nested::flag", value: true },
    { name: "array", value: [1, { x: 2 }] },
  ]);
  assert.deepEqual(
    target.relations.map(({ kind, label, targetId }) => ({ kind, label, targetId })),
    [
      { kind: "attribute", label: "self", targetId: "target" },
      { kind: "reference", label: "references", targetId: "root" },
      { kind: "reference", label: "references", targetId: "root" },
      { kind: "reference", label: "references", targetId: "root" },
      { kind: "reference", label: "references", targetId: "other" },
      { kind: "reference", label: "references", targetId: "target" },
    ],
  );
  const reversed = new IfcxSource();
  await reversed.load([
    document([{ path: "target" }, { path: "root", children: { renamed: "target" } }]),
  ]);
  assert.deepEqual((await reversed.getNode("", "target")).node.header, {
    primary: "target",
  });
});

test("failed loads preserve the prior model", async () => {
  const source = new IfcxSource();
  await source.load([await fixture("base.ifcx")]);
  for (const file of [
    new File(["{"], "bad.ifcx"),
    new File(["{}"], "bad.ifcx"),
    document([]),
    document([{ path: "x", children: { self: "x" } }]),
    document([{ path: "x", children: [] }]),
  ])
    await assert.rejects(source.load([file]));
  assert.equal((await source.getNode("", "project")).node.id, "project");
  await assert.rejects(source.getNode("", "missing"), /Node not found/);
});

test("same filename layers are composed in selection order", async () => {
  const source = new IfcxSource();
  const model = await source.load([
    document([{ path: "root", attributes: { x: 1 } }]),
    document([{ path: "root", attributes: { x: 2 } }]),
  ]);
  assert.equal(model.root.attributes[0].value, 2);
  assert.equal(model.headers.length, 2);
});
