import type { ModelSource, ModelData } from "./model";

const endpoint = import.meta.env.VITE_API_ENDPOINT as string;

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
  load(files) {
    const form = new FormData();
    files.forEach(file => form.append("files", file));
    return postFormData<ModelData>(endpoint + "/upload", form);
  },
  getNode(path, id) { return postJson(endpoint + "/get_node", { path, id }); },
  lookup(path, key, value) { return postJson(endpoint + "/lookup_entity", { path, key, value }); },
};
