import type { HeaderEntry, SearchData } from "../components/interfaces";
import type { GraphNode, GraphNodeResponse, GraphRelation } from "./graph";

export interface ModelData {
  root: GraphNode;
  relations: GraphRelation[];
  searchData: Record<string, SearchData>;
  headers: HeaderEntry[];
  path: string;
}
export interface ModelSource {
  dispose?(): void;
  load(files: File[]): Promise<ModelData>;
  getNode(path: string, id: string): Promise<GraphNodeResponse>;
  lookup(
    path: string,
    key: string,
    value: string,
  ): Promise<{ items?: SearchData["items"]; entityType?: string }>;
}
