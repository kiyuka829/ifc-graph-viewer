import type { HeaderEntry, SearchData } from "../components/interfaces";
import type { ViewNode } from "./graph";

export interface ModelData {
  root: ViewNode;
  searchData: Record<string, SearchData>;
  headers: HeaderEntry[];
  path: string;
}
export interface ModelSource {
  dispose?(): void;
  load(files: File[]): Promise<ModelData>;
  getNode(path: string, id: string): Promise<ViewNode>;
  lookup(
    path: string,
    key: string,
    value: string,
  ): Promise<{ items?: SearchData["items"]; entityType?: string }>;
}
