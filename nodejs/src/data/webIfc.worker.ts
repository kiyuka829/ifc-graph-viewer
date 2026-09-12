import { IfcAPI } from "web-ifc";
import wasmUrl from "web-ifc/web-ifc.wasm?url";
import { WebIfcModel } from "./webIfcModel";

let model: WebIfcModel;
const ready = (async () => {
  const api = new IfcAPI();
  await api.Init(() => new URL(wasmUrl, self.location.href).href, true);
  model = new WebIfcModel(api);
})();
self.onmessage = async ({ data }) => {
  const { id, method, args } = data;
  try {
    await ready;
    let result;
    if (method === "load") result = model.load(new Uint8Array(args[0]), args[1]);
    else if (method === "getNode") result = model.getNode(args[0]);
    else if (method === "lookup") result = model.lookup(args[0], args[1]);
    else throw new Error("Unknown IFC operation.");
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
