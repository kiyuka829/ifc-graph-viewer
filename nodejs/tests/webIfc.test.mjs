import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { IfcAPI } from "web-ifc";
import { WebIfcModel } from "../src/data/webIfcModel.ts";

const normalize = (node) => ({
  ...node,
  attributes: node.attributes.map((a) => ({
    ...a,
    content: {
      ...a.content,
      value:
        a.inverse && Array.isArray(a.content.value)
          ? [...a.content.value].sort((a, b) => a - b)
          : a.content.value,
    },
  })),
  references: {
    ...node.references,
    content: {
      ...node.references.content,
      value: [...node.references.content.value].sort((a, b) => a - b),
    },
  },
});
for (const schema of ["ifc2x3", "ifc4", "ifc4x3"]) {
  test(`${schema}: all nodes match IfcOpenShell including typed values and inverse/reference split`, async () => {
    const api = new IfcAPI();
    await api.Init();
    const model = new WebIfcModel(api);
    try {
      const data = model.load(
        await readFile(new URL(`fixtures/${schema}.ifc`, import.meta.url)),
        `${schema}.ifc`,
      );
      const expected = JSON.parse(
        await readFile(new URL(`fixtures/${schema}.expected.json`, import.meta.url)),
      );
      assert.equal(data.root.type, "IfcProject");
      assert.equal(
        Object.values(data.searchData).reduce((n, g) => n + g.items.length, 0),
        expected.length,
      );
      assert.equal(
        data.headers[0].header.file_schema.schemas[0],
        schema === "ifc4x3" ? "IFC4X3_ADD2" : schema.toUpperCase(),
      );
      for (const node of expected)
        assert.deepEqual(
          normalize(model.getNode(String(node.id)).node),
          normalize(node),
          `#${node.id} ${node.type}`,
        );
      assert.equal(
        model.lookup("globalId", "00000000000000000000A2").entityType,
        "IfcWall",
      );
      assert.deepEqual(model.lookup("globalId", "0000000000000000000001").items, []);
      assert.equal(model.lookup("id", "1").entityType, "IfcProject");
      assert.deepEqual(model.lookup("id", "99999").items, []);
      assert.throws(() => model.getNode("99999"), /Node not found/);
    } finally {
      model.dispose();
    }
  });
}
test("rejects invalid IFC and files without a project, and releases model state", async () => {
  const api = new IfcAPI();
  await api.Init();
  for (const input of [
    new TextEncoder().encode("invalid IFC"),
    new TextEncoder().encode(
      "ISO-10303-21;HEADER;FILE_DESCRIPTION((''),'2;1');FILE_NAME('','','',(''),'','','');FILE_SCHEMA(('IFC4'));ENDSEC;DATA;#1=IFCCARTESIANPOINT((0.,0.,0.));ENDSEC;END-ISO-10303-21;",
    ),
  ]) {
    const model = new WebIfcModel(api);
    try {
      assert.throws(() => model.load(input, "invalid.ifc"));
    } finally {
      model.dispose();
    }
    assert.throws(() => model.getNode("1"), /Node not found/);
  }
});
