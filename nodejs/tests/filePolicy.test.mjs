import assert from "node:assert/strict";
import { test } from "node:test";
import { validateFiles } from "../src/data/filePolicy.ts";
const files = (...names) => names.map((name) => ({ name }));
test("IFC-disabled configuration accepts IFCX and rejects IFC", () => {
  assert.equal(validateFiles(files("a.IFCX", "b.ifcx"), false), "ifcx");
  for (const selection of [
    files("a.ifc"),
    files("a.IFC", "b.ifcx"),
    files("b.ifcx", "a.ifc"),
  ])
    assert.throws(() => validateFiles(selection, false), /local version/);
  assert.throws(() => validateFiles(files("a.json"), false), /Only IFCX/);
});
test("IFC-enabled builds accept both formats individually and reject mixed and empty selections", () => {
  assert.equal(validateFiles(files("a.ifc"), true), "ifc");
  assert.equal(validateFiles(files("a.ifcx"), true), "ifcx");
  assert.throws(
    () => validateFiles(files("a.ifc", "b.ifcx"), true),
    /separately/,
  );
  assert.throws(() => validateFiles(files("a.ifc", "b.ifc"), true), /one IFC/);
  assert.throws(() => validateFiles([], true), /Select a file/);
});
