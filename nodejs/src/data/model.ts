import type { HeaderEntry, SearchData } from "../components/interfaces";

export interface ModelData {
  root: any;
  searchData: Record<string, SearchData>;
  headers: HeaderEntry[];
  path: string;
}
export interface ModelSource {
  dispose?(): void;
  load(files: File[]): Promise<ModelData>;
  getNode(path: string, id: string): Promise<{ node: any }>;
  lookup(
    path: string,
    key: string,
    value: string,
  ): Promise<{ items?: SearchData["items"]; entityType?: string }>;
}
