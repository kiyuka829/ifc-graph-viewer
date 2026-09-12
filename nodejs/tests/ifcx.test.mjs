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
test("composition preserves order, shallow overrides, headers, references and safe IDs", async () => {
  const source = new IfcxSource();
  const model = await source.load([
    await fixture("base.ifcx"),
    await fixture("overlay.ifcx"),
  ]);
  assert.equal(model.root.id, "project");
  assert.equal(model.headers.length, 2);
  assert.equal(
    model.root.attributes.find((a) => a.name === "label").content.value,
    "Merged",
  );
  assert.deepEqual(
    model.root.attributes.filter((a) => a.name.startsWith("nested")).map((a) => a.name),
    ["nested::replacement"],
  );
  assert.deepEqual(model.searchData.__proto__.items, [
    { id: "__proto__", displayName: "__proto__" },
  ]);
  const wall = (await source.getNode("", "wall")).node;
  assert.equal(wall.attributes.find((a) => a.name === "parent").inverse, true);
  assert.equal(wall.attributes.find((a) => a.name === "self").content.type, "value");
  assert.deepEqual(wall.references.content.value, ["second"]);
  assert.equal((await source.lookup("", "id", "__proto__")).entityType, "__proto__");
  assert.deepEqual((await source.lookup("", "id", "missing")).items, []);
});
test("JSON primitives and arrays survive; failed loads preserve previous model", async () => {
  const source = new IfcxSource();
  const loaded = await source.load([await fixture("base.ifcx")]);
  assert.deepEqual(
    loaded.root.attributes.find((a) => a.name === "nested::array").content.value,
    [1, { x: 2 }],
  );
  assert.equal(
    loaded.root.attributes.find((a) => a.name === "nested::empty").content.value,
    null,
  );
  assert.equal(
    loaded.root.attributes.find((a) => a.name === "nested::flag").content.value,
    true,
  );
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
  assert.equal(model.root.attributes[0].content.value, 2);
  assert.equal(model.headers.length, 2);
});
