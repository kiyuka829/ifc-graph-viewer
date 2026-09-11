import type { ModelData, ModelSource } from "./model";

export class WebIfcSource implements ModelSource {
  private worker = new Worker(new URL("./webIfc.worker.ts", import.meta.url), {
    type: "module",
  });
  private serial = 0;
  private pending = new Map<
    number,
    { resolve: (value: any) => void; reject: (error: Error) => void }
  >();
  constructor() {
    this.worker.onmessage = ({ data }) => {
      const request = this.pending.get(data.id);
      this.pending.delete(data.id);
      if (data.error) request?.reject(new Error(data.error));
      else request?.resolve(data.result);
    };
    this.worker.onerror = (event) =>
      this.dispose(new Error(event.message || "IFC worker failed."));
    this.worker.onmessageerror = () =>
      this.dispose(new Error("Unable to read IFC worker response."));
  }
  private call<T>(
    method: string,
    args: unknown[],
    transfer: Transferable[] = [],
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = ++this.serial;
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, method, args }, transfer);
    });
  }
  async load(files: File[]): Promise<ModelData> {
    const bytes = await files[0].arrayBuffer();
    return this.call("load", [bytes, files[0].name], [bytes]);
  }
  getNode(_path: string, id: string): ReturnType<ModelSource["getNode"]> {
    return this.call("getNode", [id]);
  }
  lookup(
    _path: string,
    key: string,
    value: string,
  ): ReturnType<ModelSource["lookup"]> {
    return this.call("lookup", [key, value]);
  }
  dispose(error = new Error("IFC model closed.")) {
    // Terminating the worker releases its WASM heap as well as the JS indexes.
    this.worker.terminate();
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
  }
}
