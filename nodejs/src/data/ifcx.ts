import type { IfcHeader, IfcHeaderValue, SearchData } from "../components/interfaces";
import type { LinkEndpoint, ViewAttribute, ViewLink, ViewNode } from "./graph.ts";
import type { ModelData, ModelSource } from "./model";

type JsonObject = Record<string, IfcHeaderValue>;
type NodeData = {
  path: string;
  children: Record<string, string>;
  inherits: Record<string, string>;
  attributes: JsonObject;
};
type Reference = { sourceId: string; endpoint: LinkEndpoint; label?: string };
type IfcxNode = {
  path: string;
  children?: Record<string, string>;
  inherits?: Record<string, string>;
  attributes?: JsonObject;
};
type IfcxDocument = {
  header: IfcHeader;
  data: IfcxNode[];
  imports?: { uri: string }[];
};
const isObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function parseIfcxDocument(text: string, name: string): IfcxDocument {
  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch {
    throw new Error(`${name}: Invalid JSON.`);
  }
  return validateIfcxDocument(document, name);
}

function validateIfcxDocument(document: unknown, name: string): IfcxDocument {
  if (
    !isObject(document) ||
    !isObject(document.header) ||
    !["ifcx-alpha", "ifcx_alpha"].includes(String(document.header.ifcxVersion))
  )
    throw new Error(`${name}: Expected IFCX version 'ifcx-alpha' or 'ifcx_alpha'.`);
  if (!Array.isArray(document.data)) throw new Error(`${name}: data must be an array.`);
  if ("imports" in document) {
    if (!Array.isArray(document.imports))
      throw new Error(`${name}: imports must be an array.`);
    if (
      !document.imports.every(
        (entry) => isObject(entry) && typeof entry.uri === "string",
      )
    )
      throw new Error(`${name}: Each import must be an object with a string uri.`);
  }
  for (const entry of document.data) {
    if (!isObject(entry) || typeof entry.path !== "string" || !entry.path)
      throw new Error(`${name}: Each node must have a non-empty path.`);
    if (entry.attributes !== undefined && !isObject(entry.attributes))
      throw new Error(`${name}: attributes must be an object.`);
    referenceMap(entry.children, "children");
    referenceMap(entry.inherits, "inherits");
  }
  return document as IfcxDocument;
}
const containsRef = (value: IfcHeaderValue): boolean =>
  Array.isArray(value)
    ? value.some(containsRef)
    : isObject(value) &&
      (typeof value.ref === "string" || Object.values(value).some(containsRef));

function flatten(object: JsonObject, prefix = ""): [string, IfcHeaderValue][] {
  const flattenValue = (
    name: string,
    value: IfcHeaderValue,
  ): [string, IfcHeaderValue][] => {
    if (isObject(value)) return flatten(value, name);
    // Keep numeric arrays (geometry, colors, etc.) intact; expand reference arrays.
    if (Array.isArray(value) && containsRef(value))
      return value.flatMap((item) => flattenValue(name, item));
    return [[name, value]];
  };
  return Object.entries(object).flatMap(([key, value]) =>
    flattenValue(prefix ? `${prefix}::${key}` : key, value),
  );
}

function isNodeReference(
  name: string,
  value: IfcHeaderValue,
  node: NodeData,
  nodes: Map<string, NodeData>,
): value is string {
  return (
    (name === "ref" || name.endsWith("::ref")) &&
    typeof value === "string" &&
    value !== node.path &&
    nodes.has(value)
  );
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
function classification(node: NodeData): string | undefined {
  const value = node.attributes["bsi::ifc::class"];
  return isObject(value) && typeof value.code === "string" ? value.code : undefined;
}

/** Alpha composition follows the Python accessor: later fields override earlier fields shallowly. */
export class IfcxSource implements ModelSource {
  private nodes = new Map<string, NodeData>();
  private references = new Map<string, Reference[]>();

  async load(files: File[]): Promise<ModelData> {
    const nodes = new Map<string, NodeData>();
    const headers: ModelData["headers"] = [];
    const documents: { document: IfcxDocument; name: string }[] = [];
    const selectedDocuments: { document: IfcxDocument; name: string }[] = [];
    const importedUris = new Set<string>();
    const addImports = async (document: IfcxDocument): Promise<void> => {
      for (const { uri } of document.imports ?? []) {
        try {
          new URL(uri);
        } catch {
          continue;
        }
        if (importedUris.has(uri)) continue;
        importedUris.add(uri);
        try {
          const response = await fetch(uri);
          if (!response.ok) throw new Error("Failed to fetch import.");
          const importedDocument = parseIfcxDocument(await response.text(), uri);
          await addImports(importedDocument);
          documents.push({ document: importedDocument, name: uri });
        } catch (error) {
          console.warn(`${uri}: Skipped import: ${String(error)}`);
        }
      }
    };
    for (const file of files) {
      const document = parseIfcxDocument(await file.text(), file.name);
      await addImports(document);
      selectedDocuments.push({ document, name: file.name });
    }
    documents.push(...selectedDocuments);
    for (const { document, name } of documents) {
      headers.push({
        filename: name,
        format: "ifcx",
        header: document.header,
      });
      for (const entry of document.data) {
        const previous = nodes.get(entry.path);
        nodes.set(entry.path, {
          path: entry.path,
          children: {
            ...previous?.children,
            ...entry.children,
          },
          inherits: {
            ...previous?.inherits,
            ...entry.inherits,
          },
          attributes: {
            ...previous?.attributes,
            ...entry.attributes,
          },
        });
      }
    }
    const references = new Map<string, Reference[]>();
    const compositionTargets = new Set<string>();
    const addReference = (target: string, reference: Reference) =>
      references.get(target)?.push(reference) ?? references.set(target, [reference]);
    for (const node of nodes.values()) {
      let index = 0;
      for (const [label, targetId] of Object.entries(node.children)) {
        compositionTargets.add(targetId);
        if (nodes.has(targetId))
          addReference(targetId, {
            sourceId: node.path,
            endpoint: { attribute: "children", index: index++ },
            label,
          });
      }
      index = 0;
      for (const [label, targetId] of Object.entries(node.inherits)) {
        compositionTargets.add(targetId);
        if (nodes.has(targetId))
          addReference(targetId, {
            sourceId: node.path,
            endpoint: { attribute: "inherits", index: index++ },
            label,
          });
      }
      const indexes = new Map<string, number>();
      for (const [label, value] of flatten(node.attributes)) {
        if (!isNodeReference(label, value, node, nodes)) continue;
        const linkIndex = indexes.get(label) ?? 0;
        indexes.set(label, linkIndex + 1);
        addReference(value, {
          sourceId: node.path,
          endpoint: { attribute: label, index: linkIndex },
        });
      }
    }
    const root = [...nodes.values()].find((node) => !compositionTargets.has(node.path));
    if (!root)
      throw new Error(
        nodes.size ? "IFCX contains no root node." : "IFCX contains no nodes.",
      );
    this.nodes = nodes;
    this.references = references;
    const searchData: Record<string, SearchData> = Object.create(null);
    for (const node of nodes.values()) {
      const group = classification(node) ?? "IFCX";
      (searchData[group] ??= { items: [] }).items.push({
        id: node.path,
        displayName: node.path,
      });
    }
    for (const group of Object.values(searchData))
      group.items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return {
      root: this.nodeInfo(root),
      searchData,
      headers,
      path: files.map((file) => file.name).join(", "),
    };
  }

  private nodeInfo(node: NodeData): ViewNode {
    const attributes: ViewAttribute[] = [];
    for (const name of ["children", "inherits"] as const) {
      const entries = Object.entries(node[name]);
      if (!entries.length) continue;
      const attribute: Extract<ViewAttribute, { links: ViewLink[] }> = {
        name,
        direction: "outgoing",
        links: [],
      };
      for (const [label, targetId] of entries) {
        if (this.nodes.has(targetId)) attribute.links.push({ nodeId: targetId, label });
        else (attribute.missingNodeIds ??= []).push(targetId);
      }
      attributes.push(attribute);
    }
    const referenceAttributes = new Map<
      string,
      Extract<ViewAttribute, { links: ViewLink[] }>
    >();
    for (const [name, value] of flatten(node.attributes)) {
      if (
        !(name === "ref" || name.endsWith("::ref")) ||
        typeof value !== "string" ||
        value === node.path
      ) {
        attributes.push({ name, value });
        continue;
      }
      let attribute = referenceAttributes.get(name);
      if (!attribute) {
        attribute = { name, direction: "outgoing", links: [] };
        referenceAttributes.set(name, attribute);
        attributes.push(attribute);
      }
      if (this.nodes.has(value)) attribute.links.push({ nodeId: value });
      else (attribute.missingNodeIds ??= []).push(value);
    }
    const code = classification(node);
    return {
      id: node.path,
      header: {
        ...(code ? { primary: code } : {}),
        secondary: node.path,
      },
      attributes,
      incoming: (this.references.get(node.path) ?? []).map(
        ({ sourceId, endpoint, label }) => ({
          nodeId: sourceId,
          endpoint,
          ...(label ? { label } : {}),
        }),
      ),
    };
  }

  async getNode(_path: string, id: string): Promise<ViewNode> {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    return this.nodeInfo(node);
  }
  async lookup(_path: string, key: string, value: string) {
    const node = key === "id" ? this.nodes.get(value) : undefined;
    return {
      entityType: node ? (classification(node) ?? "IFCX") : "",
      items: node ? [{ id: node.path, displayName: node.path }] : [],
    };
  }
}
