export interface IfcNode {
  id: string;
  type: string;
  reference: Attribute | null;
  attributes: Attribute[];
  position: Position;
  // folded: boolean; // 折りたたみ状態
}

export interface Attribute {
  name: string;
  content: AttrContent; // 接続先のIDまたはテキストデータ
  inverse: boolean;
  edgePosition: Position; // エッジの接続位置
}

export interface AttrContent {
  type: string;
  value: string | number | (string | number)[];
}

// attrName = undefined はノードの左上に接続されているとき
export interface Edge {
  id: string;
  from: {
    nodeId: string;
    attrName: string | undefined;
  };
  to: {
    nodeId: string;
    attrName: string | undefined;
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
