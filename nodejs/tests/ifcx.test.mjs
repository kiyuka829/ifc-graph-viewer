import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { IfcxSource } from "../src/data/ifcx.ts";

const fixture = async (name) =>
  new File([await readFile(new URL(`fixtures/${name}`, import.meta.url))], name);
const document = (data, imports) =>
  new File(
    [
      JSON.stringify({
        header: { ifcxVersion: "ifcx-alpha" },
        data,
        ...(imports === undefined ? {} : { imports }),
      }),
    ],
    "test.ifcx",
  );

test("composition returns node-local data without mutating headers or search data", async () => {
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
      direction: "outgoing",
      links: [
        { nodeId: "wall", label: "wall" },
        { nodeId: "__proto__", label: "__proto__" },
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
  assert.deepEqual(wall.header, { secondary: "wall" });
  assert.deepEqual(wall.incoming, [
    {
      nodeId: "project",
      endpoint: { attribute: "children", index: 0 },
      label: "wall",
    },
    {
      nodeId: "second",
      endpoint: { attribute: "inherits", index: 0 },
      label: "wall",
    },
  ]);
  assert.deepEqual((await source.lookup("", "id", "__proto__")).items, [
    { id: "__proto__", displayName: "__proto__" },
  ]);
  assert.deepEqual((await source.lookup("", "id", "missing")).items, []);
});

test("links retain labels, repeated targets, reverse endpoints, classes, and scalar values", async () => {
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
  const root = await source.getNode("", "root");
  assert.deepEqual(root.attributes.slice(0, 2), [
    {
      name: "children",
      direction: "outgoing",
      links: [
        { nodeId: "target", label: "first" },
        { nodeId: "target", label: "same" },
      ],
    },
    {
      name: "inherits",
      direction: "outgoing",
      links: [{ nodeId: "target", label: "same" }],
    },
  ]);
  assert.deepEqual(root.incoming, [
    {
      nodeId: "target",
      endpoint: { attribute: "parent::ref", index: 0 },
    },
  ]);
  const target = await source.getNode("", "target");
  assert.deepEqual(target.header, { primary: "IfcWall", secondary: "target" });
  assert.deepEqual(target.attributes, [
    { name: "bsi::ifc::class::code", value: "IfcWall" },
    {
      name: "parent::ref",
      direction: "outgoing",
      links: [{ nodeId: "root" }],
    },
    { name: "self", value: "target" },
    { name: "plain", value: "text" },
    { name: "nested::flag", value: true },
    { name: "array", value: [1, { x: 2 }] },
  ]);
  assert.deepEqual(target.incoming, [
    { nodeId: "root", endpoint: { attribute: "children", index: 0 }, label: "first" },
    { nodeId: "root", endpoint: { attribute: "children", index: 1 }, label: "same" },
    { nodeId: "root", endpoint: { attribute: "inherits", index: 0 }, label: "same" },
    { nodeId: "other", endpoint: { attribute: "children", index: 0 }, label: "second" },
  ]);
  const reversed = new IfcxSource();
  await reversed.load([
    document([{ path: "target" }, { path: "root", children: { renamed: "target" } }]),
  ]);
  assert.deepEqual((await reversed.getNode("", "target")).header, {
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
    document([{ path: "x" }], null),
    document([{ path: "x" }], [{}]),
    document([{ path: "x" }], [{ uri: 1 }]),
    document([{ path: "x" }], [[]]),
  ])
    await assert.rejects(source.load([file]));
  assert.equal((await source.getNode("", "project")).id, "project");
  await assert.rejects(source.getNode("", "missing"), /Node not found/);
});

test("imports accepts absent and empty metadata", async () => {
  const source = new IfcxSource();
  assert.equal((await source.load([document([{ path: "root" }])])).root.id, "root");
  assert.equal((await source.load([document([{ path: "root" }], [])])).root.id, "root");
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

test("only ref fields create links, including nested and repeated array references", async () => {
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
  const grouped = model.root.attributes.find(
    (a) => "links" in a && a.name === "links::ref",
  );
  assert.deepEqual(grouped.links, [{ nodeId: "target" }, { nodeId: "target" }]);
  assert.deepEqual(grouped.missingNodeIds, ["missing"]);
  assert.deepEqual((await source.getNode("", "target")).incoming.slice(-2), [
    { nodeId: "root", endpoint: { attribute: "links::ref", index: 0 } },
    { nodeId: "root", endpoint: { attribute: "links::ref", index: 1 } },
  ]);
  assert.deepEqual((await source.getNode("", "other")).incoming, [
    { nodeId: "root", endpoint: { attribute: "links::nested::ref", index: 0 } },
  ]);
});

test("unresolved links remain grouped and resolve when their targets are loaded", async () => {
  const source = new IfcxSource();
  const input = document([
    { path: "root", attributes: { links: [{ ref: "missing" }, { ref: "another" }] } },
  ]);
  const model = await source.load([input]);
  assert.deepEqual(model.root.attributes, [
    {
      name: "links::ref",
      direction: "outgoing",
      links: [],
      missingNodeIds: ["missing", "another"],
    },
  ]);
  const resolved = await source.load([
    input,
    document([{ path: "missing" }, { path: "another" }]),
  ]);
  assert.deepEqual(resolved.root.attributes[0].links, [
    { nodeId: "missing" },
    { nodeId: "another" },
  ]);
  assert.equal(resolved.root.attributes[0].missingNodeIds, undefined);
});

test("children and inherits group missing targets without dangling links", async () => {
  for (const name of ["children", "inherits"]) {
    const source = new IfcxSource();
    const input = document([
      { path: "root", [name]: { first: "target", second: "missing" } },
    ]);
    const missing = await source.load([input]);
    assert.deepEqual(missing.root.attributes, [
      {
        name,
        direction: "outgoing",
        links: [],
        missingNodeIds: ["target", "missing"],
      },
    ]);
    const mixed = await source.load([input, document([{ path: "target" }])]);
    assert.deepEqual(mixed.root.attributes[0], {
      name,
      direction: "outgoing",
      links: [{ nodeId: "target", label: "first" }],
      missingNodeIds: ["missing"],
    });
    assert.deepEqual((await source.getNode("", "target")).incoming, [
      { nodeId: "root", endpoint: { attribute: name, index: 0 }, label: "first" },
    ]);
  }
});
