import type { IfcHeader, IfcHeaderValue, SearchData } from "../components/interfaces";
import type { ModelData, ModelSource } from "./model";

type JsonObject = Record<string, IfcHeaderValue>;
type NodeData = {
  path: string;
  name?: string;
  children: Record<string, string>;
  inherits: Record<string, string>;
  attributes: JsonObject;
};
const isObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);
function flatten(object: JsonObject, prefix = ""): [string, IfcHeaderValue][] {
  return Object.entries(object).flatMap(([key, value]) => {
    const name = prefix ? `${prefix}::${key}` : key;
    return isObject(value)
      ? flatten(value, name)
      : [[name, value] as [string, IfcHeaderValue]];
  });
}
function referenceMap(
  value: IfcHeaderValue | undefined,
  label: string,
): Record<string, string> {
  if (value === undefined) return {};
  if (!isObject(value) || Object.values(value).some((id) => typeof id !== "string"))
    throw new Error(`${label} must be an object of path strings.`);
  return value as Record<string, string>;
}

/** Alpha composition follows the Python accessor: later fields override earlier fields shallowly. */
export class IfcxSource implements ModelSource {
  private nodes = new Map<string, NodeData>();
  private references = new Map<string, string[]>();

  async load(files: File[]): Promise<ModelData> {
    const nodes = new Map<string, NodeData>();
    const headers: ModelData["headers"] = [];
    for (const file of files) {
      let document: unknown;
      try {
        document = JSON.parse(await file.text());
      } catch {
        throw new Error(`${file.name}: Invalid JSON.`);
      }
      if (
        !isObject(document) ||
        !isObject(document.header) ||
        !["ifcx-alpha", "ifcx_alpha"].includes(String(document.header.ifcxVersion))
      ) {
        throw new Error(
          `${file.name}: Expected IFCX version 'ifcx-alpha' or 'ifcx_alpha'.`,
        );
      }
      if (!Array.isArray(document.data))
        throw new Error(`${file.name}: data must be an array.`);
      headers.push({
        filename: file.name,
        format: "ifcx",
        header: document.header as IfcHeader,
      });
      for (const entry of document.data) {
        if (!isObject(entry) || typeof entry.path !== "string" || !entry.path)
          throw new Error(`${file.name}: Each node must have a non-empty path.`);
        if (entry.attributes !== undefined && !isObject(entry.attributes))
          throw new Error(`${file.name}: attributes must be an object.`);
        if (entry.name !== undefined && typeof entry.name !== "string")
          throw new Error(`${file.name}: name must be a string.`);
        const previous = nodes.get(entry.path);
        nodes.set(entry.path, {
          path: entry.path,
          name: previous ? previous.name : (entry.name as string | undefined),
          children: {
            ...previous?.children,
            ...referenceMap(entry.children, "children"),
          },
          inherits: {
            ...previous?.inherits,
            ...referenceMap(entry.inherits, "inherits"),
          },
          attributes: {
            ...previous?.attributes,
            ...(entry.attributes as JsonObject | undefined),
          },
        });
      }
    }
    const references = new Map<string, string[]>();
    const addReference = (target: string, source: string) => {
      const list = references.get(target);
      if (list) list.push(source);
      else references.set(target, [source]);
    };
    for (const node of nodes.values()) {
      for (const refs of [node.children, node.inherits]) {
        for (const [name, target] of Object.entries(refs)) {
          const child = nodes.get(target);
          if (child) child.name = name;
          addReference(target, node.path);
        }
      }
      for (const [, value] of flatten(node.attributes)) {
        if (typeof value === "string" && nodes.has(value))
          addReference(value, node.path);
      }
    }
    for (const node of nodes.values()) node.name ??= "root";
    const root = [...nodes.values()].find((node) => node.name === "root");
    if (!root)
      throw new Error(
        nodes.size ? "IFCX contains no root node." : "IFCX contains no nodes.",
      );
    this.nodes = nodes;
    this.references = references;
    const searchData: Record<string, SearchData> = Object.create(null);
    for (const node of nodes.values())
      (searchData[node.name!] ??= { items: [] }).items.push({
        id: node.path,
        displayName: node.path,
      });
    for (const group of Object.values(searchData))
      group.items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return {
      root: this.nodeInfo(root),
      searchData,
      headers,
      path: files.map((file) => file.name).join(", "),
    };
  }

  private nodeInfo(node: NodeData) {
    const refIds = this.references.get(node.path) ?? [];
    const refSet = new Set(refIds);
    const attributes = [];
    for (const name of ["children", "inherits"] as const) {
      const values = Object.values(node[name]);
      if (values.length)
        attributes.push({
          name,
          content: { type: "id", value: values },
          inverse: false,
        });
    }
    const inverseIds = new Set<string>();
    for (const [name, value] of flatten(node.attributes)) {
      const inverse = typeof value === "string" && refSet.has(value);
      if (inverse) inverseIds.add(value as string);
      attributes.push({
        name,
        content: {
          type:
            typeof value === "string" && value !== node.path && this.nodes.has(value)
              ? "id"
              : "value",
          value,
        },
        inverse,
      });
    }
    return {
      id: node.path,
      type: node.name,
      attributes,
      references: {
        name: "references",
        content: { type: "id", value: refIds.filter((id) => !inverseIds.has(id)) },
        inverse: true,
      },
    };
  }
  async getNode(_path: string, id: string) {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    return { node: this.nodeInfo(node) };
  }
  async lookup(_path: string, key: string, value: string) {
    const node = key === "id" ? this.nodes.get(value) : undefined;
    return {
      entityType: node?.name ?? "",
      items: node ? [{ id: node.path, displayName: node.path }] : [],
    };
  }
}
