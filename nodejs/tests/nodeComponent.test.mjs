import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "typescript";
import { reactive } from "vue";

const require = createRequire(import.meta.url);
const filename = new URL("../src/components/NodeComponent.vue", import.meta.url);
const { descriptor } = parse(await readFile(filename, "utf8"));
const script = compileScript(descriptor, { id: "test-node", inlineTemplate: true });
const { outputText } = ts.transpileModule(script.content, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const componentRequire = (id) => {
  if (id === "../data/graph") return require("../src/data/graph.ts");
  if (id === "./utils") return require("../src/components/utils.ts");
  return require(id);
};
const compiled = { exports: {} };
new Function("require", "module", "exports", outputText)(
  componentRequire,
  compiled,
  compiled.exports,
);
const NodeComponent = compiled.exports.default;

function text(vnode) {
  if (Array.isArray(vnode)) return vnode.map(text).join(" ");
  if (typeof vnode === "string") return vnode;
  return vnode && typeof vnode === "object" ? text(vnode.children) : "";
}

test("reused node component renders new attributes and ports after a model replacement", () => {
  const props = reactive({
    node: {
      id: "same-root",
      header: { secondary: "old-model" },
      attributes: [
        {
          name: "children",
          direction: "outgoing",
          links: [{ nodeId: "old-target", label: "old" }],
        },
      ],
      incoming: [],
    },
    state: { position: { x: 0, y: 0 }, portPositions: {} },
    selected: false,
    scale: 1,
  });
  let emitted;
  const render = NodeComponent.setup(props, {
    expose() {},
    emit(...args) {
      emitted = args;
    },
  });
  assert.match(text(render({}, [])), /old-model/);
  props.node = {
    id: "same-root",
    header: { secondary: "new-model" },
    attributes: [
      {
        name: "children",
        direction: "outgoing",
        links: [{ nodeId: "new-target", label: "new" }],
      },
    ],
    incoming: [],
  };
  const updated = render({}, []);
  assert.match(text(updated), /new-model/);
  assert.doesNotMatch(text(updated), /old-model/);
  // The port's handler must receive the new relation rather than an empty list.
  function findDot(vnode) {
    if (Array.isArray(vnode)) return vnode.map(findDot).find(Boolean);
    if (!vnode || typeof vnode !== "object") return undefined;
    if (vnode.props?.class === "dot" || vnode.props?.class?.startsWith("dot "))
      return vnode;
    return findDot(vnode.children);
  }
  const dot = findDot(updated);
  assert.ok(dot);
  // Missing old relation used to make this handler return before emitting.
  const previousDocument = globalThis.document;
  const listeners = new Map();
  globalThis.document = {
    addEventListener(name, handler) {
      listeners.set(name, handler);
    },
    removeEventListener(name) {
      listeners.delete(name);
    },
  };
  try {
    dot.props.onMousedown({
      preventDefault() {},
      stopPropagation() {},
      clientX: 0,
      clientY: 0,
    });
    assert.equal(emitted?.[0], "update:drawingEdgePosition");
    listeners.get("mouseup")();
    assert.equal(emitted[0], "add:node");
    assert.equal(emitted[1].group.links[0].nodeId, "new-target");
  } finally {
    globalThis.document = previousDocument;
  }
});
