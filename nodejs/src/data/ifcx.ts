import type { IfcHeader, IfcHeaderValue, SearchData } from "../components/interfaces";
import { relationId } from "./graph.ts";
import type {
  GraphAttribute,
  GraphNode,
  GraphNodeResponse,
  GraphRelation,
  GraphRelationKind,
} from "./graph.ts";
import type { ModelData, ModelSource } from "./model";

type JsonObject = Record<string, IfcHeaderValue>;
type NodeData = {
  path: string;
  children: Record<string, string>;
  inherits: Record<string, string>;
  attributes: JsonObject;
};
type Reference = { sourceId: string; originalRelationId: string };
const isObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);
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
      )
        throw new Error(
          `${file.name}: Expected IFCX version 'ifcx-alpha' or 'ifcx_alpha'.`,
        );
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
        const previous = nodes.get(entry.path);
        nodes.set(entry.path, {
          path: entry.path,
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
    const references = new Map<string, Reference[]>();
    const compositionTargets = new Set<string>();
    const addReference = (
      target: string,
      sourceId: string,
      originalRelationId: string,
    ) =>
      references.get(target)?.push({ sourceId, originalRelationId }) ??
      references.set(target, [{ sourceId, originalRelationId }]);
    for (const node of nodes.values()) {
      const occurrences = new Map<string, number>();
      const addForwardReference = (
        kind: GraphRelationKind,
        label: string,
        targetId: string,
      ) => {
        const key = JSON.stringify([node.path, kind, label, targetId]);
        const occurrence = occurrences.get(key) ?? 0;
        occurrences.set(key, occurrence + 1);
        addReference(
          targetId,
          node.path,
          relationId(node.path, kind, label, targetId, occurrence),
        );
      };
      for (const [label, targetId] of Object.entries(node.children)) {
        compositionTargets.add(targetId);
        addForwardReference("child", label, targetId);
      }
      for (const [label, targetId] of Object.entries(node.inherits)) {
        compositionTargets.add(targetId);
        addForwardReference("inherits", label, targetId);
      }
      for (const [label, value] of flatten(node.attributes))
        if (isNodeReference(label, value, node, nodes))
          addForwardReference("attribute", label, value);
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
    const response = this.nodeInfo(root);
    return {
      root: response.node,
      relations: response.relations,
      searchData,
      headers,
      path: files.map((file) => file.name).join(", "),
    };
  }

  private nodeInfo(node: NodeData): GraphNodeResponse {
    const relations: GraphRelation[] = [];
    const occurrences = new Map<string, number>();
    const addRelation = (
      kind: GraphRelationKind,
      label: string,
      targetId: string,
      originalRelationId?: string,
    ) => {
      const key = JSON.stringify([node.path, kind, label, targetId]);
      const occurrence = occurrences.get(key) ?? 0;
      occurrences.set(key, occurrence + 1);
      const id = relationId(node.path, kind, label, targetId, occurrence);
      relations.push({
        id,
        sourceId: node.path,
        targetId,
        kind,
        label,
        ...(originalRelationId ? { originalRelationId } : {}),
      });
      return id;
    };
    const children = Object.entries(node.children).map(([label, targetId]) =>
      addRelation("child", label, targetId),
    );
    const inherits = Object.entries(node.inherits).map(([label, targetId]) =>
      addRelation("inherits", label, targetId),
    );
    const attributes: GraphAttribute[] = [
      ...(children.length ? [{ name: "children", relationIds: children }] : []),
      ...(inherits.length ? [{ name: "inherits", relationIds: inherits }] : []),
    ];
    const referenceAttributes = new Map<
      string,
      Extract<GraphAttribute, { relationIds: string[] }>
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
        attribute = { name, relationIds: [] };
        referenceAttributes.set(name, attribute);
        attributes.push(attribute);
      }
      if (this.nodes.has(value))
        attribute.relationIds.push(addRelation("attribute", name, value));
      else (attribute.unresolvedTargetIds ??= []).push(value);
    }
    for (const reference of this.references.get(node.path) ?? [])
      addRelation(
        "reference",
        "references",
        reference.sourceId,
        reference.originalRelationId,
      );
    const code = classification(node);
    const graphNode: GraphNode = {
      id: node.path,
      header: {
        ...(code ? { primary: code } : {}),
        secondary: node.path,
      },
      attributes,
      relationIds: relations.map((relation) => relation.id),
    };
    return { node: graphNode, relations };
  }

  async getNode(_path: string, id: string): Promise<GraphNodeResponse> {
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
