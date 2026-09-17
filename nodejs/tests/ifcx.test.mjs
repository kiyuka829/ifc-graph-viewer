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
  assert.deepEqual(model.root.header, { secondary: "project" });
  assert.equal(model.headers.length, 2);
  assert.deepEqual(model.root.attributes, [
    {
      name: "children",
      relationIds: [
        '["project","child","wall","wall",0]',
        '["project","child","__proto__","__proto__",0]',
      ],
    },
    { name: "label", value: "Merged" },
    { name: "nested::replacement", value: 42 },
  ]);
  const base = await new IfcxSource().load([await fixture("base.ifcx")]);
  assert.deepEqual(base.root.attributes.slice(2), [
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
  assert.deepEqual(wall.node.header, { secondary: "wall" });
  assert.deepEqual(
    wall.relations.map(({ kind, label, targetId }) => ({ kind, label, targetId })),
    [
      { kind: "reference", label: "references", targetId: "project" },
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
          parent: { ref: "root" },
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
    primary: "IfcWall",
    secondary: "target",
  });
  const root = await source.getNode("", "root");
  assert.deepEqual(root.node.attributes, [
    {
      name: "children",
      relationIds: [
        '["root","child","first","target",0]',
        '["root","child","same","target",0]',
      ],
    },
    {
      name: "inherits",
      relationIds: ['["root","inherits","same","target",0]'],
    },
  ]);
  assert.deepEqual(
    root.relations.map(({ kind, label, targetId }) => ({ kind, label, targetId })),
    [
      { kind: "child", label: "first", targetId: "target" },
      { kind: "child", label: "same", targetId: "target" },
      { kind: "inherits", label: "same", targetId: "target" },
      { kind: "reference", label: "references", targetId: "target" },
    ],
  );
  assert.equal(new Set(root.relations.map((relation) => relation.id)).size, 4);
  assert.equal(
    root.relations.at(-1)?.originalRelationId,
    '["target","attribute","parent::ref","root",0]',
  );
  const target = await source.getNode("", "target");
  assert.deepEqual(target.node.attributes, [
    { name: "bsi::ifc::class::code", value: "IfcWall" },
    {
      name: "parent::ref",
      relationIds: ['["target","attribute","parent::ref","root",0]'],
    },
    { name: "self", value: "target" },
    { name: "plain", value: "text" },
    { name: "nested::flag", value: true },
    { name: "array", value: [1, { x: 2 }] },
  ]);
  assert.deepEqual(
    target.relations.map(({ kind, label, targetId }) => ({ kind, label, targetId })),
    [
      { kind: "attribute", label: "parent::ref", targetId: "root" },
      { kind: "reference", label: "references", targetId: "root" },
      { kind: "reference", label: "references", targetId: "root" },
      { kind: "reference", label: "references", targetId: "root" },
      { kind: "reference", label: "references", targetId: "other" },
    ],
  );
  assert.deepEqual(
    target.relations.map((relation) => relation.originalRelationId),
    [
      undefined,
      '["root","child","first","target",0]',
      '["root","child","same","target",0]',
      '["root","inherits","same","target",0]',
      '["other","child","second","target",0]',
    ],
  );
  const reversed = new IfcxSource();
  await reversed.load([
    document([{ path: "target" }, { path: "root", children: { renamed: "target" } }]),
  ]);
  assert.deepEqual((await reversed.getNode("", "target")).node.header, {
    secondary: "target",
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

test("only ref fields create edges, including nested and repeated array references", async () => {
  const source = new IfcxSource();
  const model = await source.load([
    document([
      {
        path: "root",
        attributes: {
          label: "target",
          direct: { ref: "target" },
          links: [
            { ref: "target", label: "target" },
            { ref: "target" },
            { ref: "missing" },
            { ref: "root" },
            { ref: 42 },
            { nested: [{ ref: "other" }] },
            "target",
          ],
          strings: ["target"],
          points: [[1, 2, 3]],
        },
      },
      { path: "target" },
      { path: "other" },
    ]),
  ]);
  const outgoing = model.relations.filter((relation) => relation.kind === "attribute");
  assert.deepEqual(
    outgoing.map(({ label, targetId }) => [label, targetId]),
    [
      ["direct::ref", "target"],
      ["links::ref", "target"],
      ["links::ref", "target"],
      ["links::nested::ref", "other"],
    ],
  );
  assert.deepEqual(
    model.root.attributes.filter((a) => "value" in a).map((a) => [a.name, a.value]),
    [
      ["label", "target"],
      ["links::label", "target"],
      ["links::ref", "root"],
      ["links::ref", 42],
      ["links", "target"],
      ["strings", ["target"]],
      ["points", [[1, 2, 3]]],
    ],
  );
  const grouped = model.root.attributes.filter(
    (a) => "relationIds" in a && a.name === "links::ref",
  );
  assert.equal(grouped.length, 1);
  assert.deepEqual(grouped[0].unresolvedTargetIds, ["missing"]);
  assert.deepEqual(
    grouped[0].relationIds,
    outgoing.filter((r) => r.label === "links::ref").map((r) => r.id),
  );
  assert.equal(new Set(grouped[0].relationIds).size, 2);
  for (const id of ["target", "other"]) {
    const target = await source.getNode("", id);
    assert.deepEqual(
      target.relations.map((r) => r.originalRelationId),
      outgoing.filter((r) => r.targetId === id).map((r) => r.id),
    );
  }
});

test("unresolved refs remain grouped and resolve when their target is loaded", async () => {
  const source = new IfcxSource();
  const input = document([
    { path: "root", attributes: { links: [{ ref: "missing" }, { ref: "another" }] } },
  ]);
  const model = await source.load([input]);
  assert.deepEqual(model.root.attributes, [
    {
      name: "links::ref",
      relationIds: [],
      unresolvedTargetIds: ["missing", "another"],
    },
  ]);
  assert.deepEqual(model.relations, []);
  const resolved = await source.load([
    input,
    document([{ path: "missing" }, { path: "another" }]),
  ]);
  assert.equal(resolved.root.attributes.length, 1);
  assert.equal(resolved.root.attributes[0].relationIds.length, 2);
  assert.equal(resolved.root.attributes[0].unresolvedTargetIds, undefined);
});

test("children and inherits group missing targets without creating dangling relations", async () => {
  for (const [name, kind] of [
    ["children", "child"],
    ["inherits", "inherits"],
  ]) {
    const source = new IfcxSource();
    const input = document([
      { path: "root", [name]: { first: "target", second: "missing" } },
    ]);
    const missing = await source.load([input]);
    assert.deepEqual(missing.root.attributes, [
      { name, relationIds: [], unresolvedTargetIds: ["target", "missing"] },
    ]);
    assert.deepEqual(missing.relations, []);
    const mixed = await source.load([input, document([{ path: "target" }])]);
    assert.equal(mixed.root.attributes.length, 1);
    assert.deepEqual(mixed.root.attributes[0].unresolvedTargetIds, ["missing"]);
    assert.equal(mixed.relations.length, 1);
    assert.equal(mixed.relations[0].kind, kind);
    assert.equal(mixed.relations[0].label, "first");
    assert.equal(mixed.relations[0].targetId, "target");
    const target = await source.getNode("", "target");
    assert.equal(target.relations[0].originalRelationId, mixed.relations[0].id);
    const resolved = await source.load([
      input,
      document([{ path: "target" }, { path: "missing" }]),
    ]);
    assert.equal(resolved.root.attributes[0].unresolvedTargetIds, undefined);
    assert.equal(resolved.root.attributes[0].relationIds.length, 2);
  }
});
