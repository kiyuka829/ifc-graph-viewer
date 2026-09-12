import { enableIfc } from "./config";
import { validateFiles } from "./filePolicy";
import { IfcxSource } from "./ifcx";
import type { ModelSource } from "./model";

let active: ModelSource | undefined;
export const modelSource: ModelSource = {
  async load(files) {
    const format = validateFiles(files, enableIfc);
    const next: ModelSource =
      enableIfc && format === "ifc"
        ? (await import("#ifc-source")).createIfcSource()
        : new IfcxSource();
    try {
      const data = await next.load(files);
      active?.dispose?.();
      active = next;
      return data;
    } catch (error) {
      next.dispose?.();
      throw error;
    }
  },
  getNode: (path, id) =>
    active
      ? active.getNode(path, id)
      : Promise.reject(new Error("Load a model first.")),
  lookup: (path, key, value) =>
    active
      ? active.lookup(path, key, value)
      : Promise.reject(new Error("Load a model first.")),
};
