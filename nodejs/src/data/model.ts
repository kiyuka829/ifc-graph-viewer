import type { HeaderEntry, SearchData, SearchItem } from "../components/interfaces";
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
  buildIncoming?(): Promise<void>;
  getSearchItems?(path: string, type: string): Promise<SearchItem[]>;
  getNode(path: string, id: string): Promise<ViewNode>;
  lookup(
    path: string,
    key: string,
    value: string,
  ): Promise<{ items?: SearchData["items"]; entityType?: string }>;
}
