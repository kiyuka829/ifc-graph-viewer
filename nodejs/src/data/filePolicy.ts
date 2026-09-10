export function validateFiles(files: Pick<File, "name">[], enableIfc: boolean): "ifc" | "ifcx" {
  if (!files.length) throw new Error("Select a file.");
  const extensions = files.map(file => file.name.split(".").pop()?.toLowerCase());
  if (!enableIfc && extensions.includes("ifc")) throw new Error("IFC loading is unavailable in this version. Please use the local version for IFC files.");
  if (extensions.some(extension => extension !== "ifc" && extension !== "ifcx")) throw new Error(enableIfc ? "Only IFC and IFCX files are supported." : "Only IFCX files are supported.");
  if (new Set(extensions).size !== 1) throw new Error("Load IFC and IFCX files separately.");
  return extensions[0] as "ifc" | "ifcx";
}
