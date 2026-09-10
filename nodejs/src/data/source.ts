import { apiSource } from "./api";
import { IfcxSource } from "./ifcx";
import type { ModelSource } from "./model";

let active: ModelSource = apiSource;
export const modelSource: ModelSource = {
  async load(files) {
    if (!files.length) throw new Error("Select a file.");
    const extensions = files.map(file => file.name.split(".").pop()?.toLowerCase());
    if (extensions.some(extension => extension !== "ifc" && extension !== "ifcx")) throw new Error("Only IFC and IFCX files are supported.");
    if (new Set(extensions).size !== 1) throw new Error("Load IFC and IFCX files separately.");
    const next = extensions[0] === "ifcx" ? new IfcxSource() : apiSource;
    const data = await next.load(files);
    active = next;
    return data;
  },
  getNode: (path, id) => active.getNode(path, id),
  lookup: (path, key, value) => active.lookup(path, key, value),
};
