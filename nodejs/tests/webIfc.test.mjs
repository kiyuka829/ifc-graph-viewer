import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { IfcAPI } from "web-ifc";
import { WebIfcModel } from "../src/data/webIfcModel.ts";

const normalize = (node) => ({
  ...node,
  incoming: [...node.incoming].sort((a, b) => a.nodeId.localeCompare(b.nodeId)),
});

const expectedViewNode = (node) => ({
  id: String(node.id),
  header: { primary: node.type, secondary: `#${node.id}` },
  attributes: node.attributes.map(({ name, content, inverse }) =>
    content.type === "id"
      ? {
          name,
          direction: inverse ? "incoming" : "outgoing",
          links: (Array.isArray(content.value) ? content.value : [content.value])
            .filter((id) => id !== null)
            .map((id) => ({ nodeId: String(id) })),
        }
      : {
          name,
          value:
            node.type === "IfcCartesianPoint" && name === "Coordinates"
              ? content.value.map((value) =>
                  Number.isInteger(value) ? `${value}.` : String(value),
                )
              : content.value,
        },
  ),
  incoming: (Array.isArray(node.references.content.value)
    ? node.references.content.value
    : [node.references.content.value]
  )
    .filter((id) => id !== null)
    .map((id) => ({ nodeId: String(id) })),
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
      assert.equal(data.root.header.primary, "IfcProject");
      assert.deepEqual(
        normalize(data.root),
        normalize(expectedViewNode(expected.find((node) => node.id === 1))),
      );
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
          normalize(model.getNode(String(node.id))),
          normalize(expectedViewNode(node)),
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

test("preserves raw numbers and displays typed IFC values", async () => {
  const api = new IfcAPI();
  await api.Init();
  const model = new WebIfcModel(api);
  const ifc = String.raw`ISO-10303-21;
HEADER;
FILE_DESCRIPTION((''),'2;1');
FILE_NAME('','','',(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('0000000000000000000001',$,$,$,$,$,$,$,$);
#97=IFCPROPERTYSINGLEVALUE('Label',$,IFCLABEL('\X2\65E5672C8A9E\X0\'),$);
#98=IFCPROPERTYSINGLEVALUE('Identifier',$,IFCIDENTIFIER('1234'),$);
#99=IFCPROPERTYSINGLEVALUE('Area',$,IFCAREAMEASURE(288.),$);
#100=IFCPROPERTYSINGLEVALUE('True',$,IFCBOOLEAN(.T.),$);
#101=IFCPROPERTYSINGLEVALUE('False',$,IFCBOOLEAN(.F.),$);
#102=IFCPROPERTYSINGLEVALUE('Unknown',$,IFCLOGICAL(.U.),$);
#103=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
#104=IFCCARTESIANPOINT((2.,2.E0));
ENDSEC;
END-ISO-10303-21;`;
  const value = (id, name) => {
    const attribute = model
      .getNode(String(id))
      .attributes.find((item) => item.name === name);
    assert.ok(attribute && "value" in attribute);
    return attribute.value;
  };
  try {
    model.load(new TextEncoder().encode(ifc), "values.ifc");
    assert.equal(value(97, "NominalValue"), "IfcLabel('日本語')");
    assert.equal(value(98, "NominalValue"), "IfcIdentifier('1234')");
    assert.equal(value(99, "NominalValue"), "IfcAreaMeasure(288.)");
    assert.equal(value(100, "NominalValue"), "IfcBoolean(.T.)");
    assert.equal(value(101, "NominalValue"), "IfcBoolean(.F.)");
    assert.equal(value(102, "NominalValue"), "IfcLogical(.U.)");
    assert.equal(value(103, "UnitType"), "LENGTHUNIT");
    assert.equal(value(103, "Name"), "METRE");
    assert.deepEqual(value(104, "Coordinates"), ["2.", "2.E0"]);
  } finally {
    model.dispose();
  }
});

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
