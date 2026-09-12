import {
  IfcAPI,
  IFCPROJECT,
  FILE_DESCRIPTION,
  FILE_NAME,
  FILE_SCHEMA,
  REF,
  LABEL,
  REAL,
  IFCGEOMETRICREPRESENTATIONSUBCONTEXT,
} from "web-ifc";
import type { ModelData } from "./model";

// Keep the WASM API inside its worker; only plain data crosses the boundary.
export class WebIfcModel {
  private model = -1;
  private ids = new Set<number>();
  private incoming = new Map<number, Set<number>>();
  private api: IfcAPI;
  constructor(api: IfcAPI) {
    this.api = api;
  }

  dispose() {
    if (this.model >= 0) this.api.CloseModel(this.model);
    this.model = -1;
    this.ids.clear();
    this.incoming.clear();
  }

  load(bytes: Uint8Array, filename: string): ModelData {
    if (this.model >= 0)
      throw new Error("Create a new IFC model before loading another file.");
    this.model = this.api.OpenModel(bytes);
    if (this.model < 0)
      throw new Error("Unable to open IFC: invalid file or unsupported schema.");
    const all = this.api.GetAllLines(this.model);
    for (let i = 0; i < all.size(); i++) this.ids.add(all.get(i));
    const searchData: ModelData["searchData"] = Object.create(null);
    for (const id of this.ids) {
      const line = this.api.GetLine(this.model, id);
      const type = this.api.GetNameFromTypeCode(line.type);
      (searchData[type] ??= { items: [] }).items.push(this.searchItem(line));
      this.visitReferences(
        this.api.GetRawLineData(this.model, id).arguments,
        (target) => {
          if (!this.incoming.has(target)) this.incoming.set(target, new Set());
          this.incoming.get(target)!.add(id);
        },
      );
    }
    for (const group of Object.values(searchData))
      group.items.sort((a, b) => Number(a.id) - Number(b.id));
    const projects = this.api.GetLineIDsWithType(this.model, IFCPROJECT);
    if (!projects.size()) throw new Error("IFC contains no IfcProject.");
    const headerArgs = (type: number) =>
      this.unwrap(this.api.GetHeaderLine(this.model, type)?.arguments ?? []) as any[];
    const description = headerArgs(FILE_DESCRIPTION),
      name = headerArgs(FILE_NAME),
      schema = headerArgs(FILE_SCHEMA);
    return {
      path: filename,
      root: this.getNode(String(projects.get(0))).node,
      searchData,
      headers: [
        {
          filename,
          format: "ifc",
          header: {
            file_description: {
              description: description[0] ?? [],
              implementation_level: description[1] ?? "",
            },
            file_name: {
              name: name[0] ?? "",
              time_stamp: name[1] ?? "",
              author: name[2] ?? [],
              organization: name[3] ?? [],
              preprocessor_version: name[4] ?? "",
              originating_system: name[5] ?? "",
              authorization: name[6] ?? "",
            },
            file_schema: { schemas: schema[0] ?? [] },
          },
        },
      ],
    };
  }

  private visitReferences(value: any, visit: (id: number) => void) {
    if (Array.isArray(value)) value.forEach((v) => this.visitReferences(v, visit));
    else if (value && typeof value === "object") {
      if (value.type === REF && value.value > 0) visit(value.value);
      else Object.values(value).forEach((v) => this.visitReferences(v, visit));
    }
  }

  private unwrap(value: any): any {
    if (Array.isArray(value)) return value.map((v) => this.unwrap(v));
    if (value && typeof value === "object") {
      if (value.type === REF) return value.value > 0 ? value.value : null;
      if ("value" in value) return this.unwrap(value.value);
    }
    return value ?? null;
  }

  private content(value: any, raw?: any): { type: string; value: any } {
    if (raw === null) return { type: "value", value: null };
    const isRef = (v: any) => v?.type === REF && v.value > 0;
    const refs = isRef(value) || (Array.isArray(value) && value.every(isRef));
    const convert = (v: any, r: any): any => {
      if (Array.isArray(v)) return v.map((item, i) => convert(item, r?.[i]));
      if (r?.type === LABEL) {
        const val = this.unwrap(v);
        let literal =
          typeof val === "string"
            ? `'${val}'`
            : typeof val === "boolean"
              ? val
                ? ".T."
                : ".F."
              : String(val).replace("e", "E");
        if (v?.name === "IFCLOGICAL" && val === null) literal = ".U.";
        if (
          typeof val === "number" &&
          v.type === REAL &&
          Number.isInteger(val) &&
          !literal.includes("E")
        )
          literal += ".";
        return `${this.api.GetNameFromTypeCode(r.typecode)}(${literal})`;
      }
      return this.unwrap(v);
    };
    return { type: refs ? "id" : "value", value: convert(value, raw) };
  }

  getNode(value: string) {
    const id = Number(value);
    if (!this.ids.has(id)) throw new Error(`Node not found: ${value}`);
    const normal = this.api.GetLine(this.model, id);
    const expanded = this.api.GetLine(this.model, id, false, true);
    const raw = this.api.GetRawLineData(this.model, id).arguments;
    let rawIndex = 0;
    const attributes = Object.keys(normal)
      .filter((k) => k !== "expressID" && k !== "type")
      .map((name) => {
        // Derived attributes have a zero handle and consume no STEP argument.
        const derived =
          (normal[name]?.type === REF && normal[name].value === 0) ||
          (normal.type === IFCGEOMETRICREPRESENTATIONSUBCONTEXT &&
            [
              "CoordinateSpaceDimension",
              "Precision",
              "WorldCoordinateSystem",
              "TrueNorth",
            ].includes(name));
        return {
          name,
          content: derived
            ? { type: "value", value: null }
            : this.content(normal[name], raw[rawIndex++]),
          inverse: false,
        };
      });
    const inverseIds = new Set<number>();
    for (const name of Object.keys(expanded).filter((k) => !(k in normal))) {
      this.visitReferences(expanded[name], (id) => inverseIds.add(id));
      attributes.push({
        name,
        content: this.content(
          expanded[name] == null
            ? []
            : Array.isArray(expanded[name])
              ? expanded[name]
              : [expanded[name]],
        ),
        inverse: true,
      });
    }
    return {
      node: {
        id,
        type: this.api.GetNameFromTypeCode(normal.type),
        attributes,
        references: {
          name: "references",
          content: {
            type: "id",
            value: [...(this.incoming.get(id) ?? [])]
              .filter((ref) => !inverseIds.has(ref))
              .sort((a, b) => a - b),
          },
          inverse: true,
        },
      },
    };
  }

  private searchItem(line: any) {
    return {
      id: String(line.expressID),
      displayName: [`#${line.expressID}`, line.GlobalId?.value, line.Name?.value]
        .filter((v) => v !== undefined && v !== null)
        .join(" | "),
    };
  }

  lookup(key: string, value: string) {
    const id =
      key === "id"
        ? Number(value)
        : key === "globalId"
          ? this.api.GetExpressIdFromGuid(this.model, value)
          : undefined;
    if (typeof id !== "number" || !this.ids.has(id))
      return { entityType: "", items: [] };
    const line = this.api.GetLine(this.model, id);
    return {
      entityType: this.api.GetNameFromTypeCode(line.type),
      items: [this.searchItem(line)],
    };
  }
}
