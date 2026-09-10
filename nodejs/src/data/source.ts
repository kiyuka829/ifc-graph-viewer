import { enableIfc } from "./config";
import { validateFiles } from "./filePolicy";
import { IfcxSource } from "./ifcx";
import type { ModelSource } from "./model";

let active: ModelSource | undefined;
export const modelSource: ModelSource = {
  async load(files) {
    const format = validateFiles(files, enableIfc);
    const next = enableIfc && format === "ifc" ? (await import("./api")).apiSource : new IfcxSource();
    const data = await next.load(files);
    active = next;
    return data;
  },
  getNode: (path, id) => active ? active.getNode(path, id) : Promise.reject(new Error("Load a model first.")),
  lookup: (path, key, value) => active ? active.lookup(path, key, value) : Promise.reject(new Error("Load a model first.")),
};
