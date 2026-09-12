export interface CanvasNodeState {
  position: Position;
  portPositions: Record<string, Position>;
}

export interface CanvasEdge {
  id: string;
  relationId: string;
  from: {
    nodeId: string;
    portId?: string;
  };
  to: {
    nodeId: string;
    portId?: string;
  };
}

export interface Position {
  x: number;
  y: number;
}

export interface SearchData {
  items: SearchItem[];
}

export interface SearchItem {
  id: string;
  displayName: string;
}

export type IfcHeaderValue =
  | string
  | number
  | boolean
  | null
  | IfcHeaderValue[]
  | { [key: string]: IfcHeaderValue };

export interface IfcFileDescription {
  description: string[];
  implementation_level: string;
}

export interface IfcFileName {
  name: string;
  time_stamp: string;
  author: string[];
  organization: string[];
  preprocessor_version: string;
  originating_system: string;
  authorization: string;
}

export interface IfcFileSchema {
  schemas: string[];
}

export interface IfcHeader {
  [key: string]: IfcHeaderValue;
}

export interface IfcStructuredHeader {
  file_description?: IfcFileDescription;
  file_name?: IfcFileName;
  file_schema?: IfcFileSchema;
}

export interface HeaderEntry {
  filename: string;
  format: "ifc" | "ifcx";
  header: IfcHeader;
}
