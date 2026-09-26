import assert from "node:assert/strict";
import { test } from "node:test";
import { apiSource } from "../src/data/api.ts";

const viewNode = {
  id: "1",
  header: { primary: "IfcProject", secondary: "#1" },
  attributes: [{ name: "Name", value: "Project" }],
  incoming: [{ nodeId: "2" }],
};

test("API source passes through view nodes and normalizes search IDs", async () => {
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    const payload =
      url === "/upload"
        ? {
            root: viewNode,
            searchData: { IfcProject: { items: [{ id: 1, displayName: "#1" }] } },
            headers: [],
            path: "model.ifc",
          }
        : url === "/get_node"
          ? { node: viewNode }
          : { entityType: "IfcProject", items: [{ id: 1, displayName: "#1" }] };
    return new Response(JSON.stringify(payload));
  };
  try {
    const loaded = await apiSource.load([new File(["IFC"], "MODEL.IFC")]);
    assert.deepEqual(loaded.root, viewNode);
    assert.equal(loaded.searchData.IfcProject.items[0].id, "1");
    assert.deepEqual(await apiSource.getNode("model.ifc", "1"), viewNode);
    assert.equal((await apiSource.lookup("model.ifc", "id", "1")).items[0].id, "1");
    assert.equal((await calls[0].options.body.get("files")).name, "MODEL.ifc");
  } finally {
    globalThis.fetch = previous;
  }
});

test("API source preserves HTTP failures", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response("", { status: 500 });
  try {
    await assert.rejects(apiSource.lookup("model.ifc", "id", "1"), /status 500/);
  } finally {
    globalThis.fetch = previous;
  }
});
