import type { ModelSource, ModelData } from "./model";
import type { ViewNode } from "./graph.ts";
import type { SearchData } from "../components/interfaces";

const endpoint = (import.meta.env?.VITE_API_ENDPOINT ?? "") as string;

type LegacySearchData = Record<
  string,
  { items: { id: string | number; displayName: string }[] }
>;
type ApiModelData = Omit<ModelData, "searchData"> & {
  root: ViewNode;
  searchData: LegacySearchData;
};
type SearchResponse = { items?: { id: string | number; displayName: string }[] };

function normalizeSearch<T extends SearchResponse>(
  response: T,
): Omit<T, "items"> & { items?: SearchData["items"] } {
  return {
    ...response,
    items: response.items?.map((item) => ({ ...item, id: String(item.id) })),
  };
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

async function postFormData<T>(url: string, payload: FormData): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    body: payload,
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export const apiSource: ModelSource = {
  async load(files) {
    const form = new FormData();
    files.forEach((file) => {
      // The Python endpoint dispatches using a case-sensitive suffix.
      const filename = file.name.replace(/\.[^.]+$/, (extension) =>
        extension.toLowerCase(),
      );
      form.append("files", file, filename);
    });
    const data = await postFormData<ApiModelData>(endpoint + "/upload", form);
    return {
      ...data,
      searchData: normalizeSearchData(data.searchData),
    };
  },
  async getNode(path, id) {
    const { node } = await postJson<{ node: ViewNode }>(endpoint + "/get_node", {
      path,
      id,
    });
    return node;
  },
  async lookup(path, key, value) {
    return normalizeSearch(
      await postJson<SearchResponse & { entityType?: string }>(
        endpoint + "/lookup_entity",
        {
          path,
          key,
          value,
        },
      ),
    );
  },
};

function normalizeSearchData(searchData: LegacySearchData): ModelData["searchData"] {
  return Object.fromEntries(
    Object.entries(searchData).map(([type, data]) => [
      type,
      { items: data.items.map((item) => ({ ...item, id: String(item.id) })) },
    ]),
  );
}

export function createIfcSource(): ModelSource {
  return apiSource;
}
