export interface IfcNode {
  id: number;
  type: string;
  reference: Attribute | null;
  attributes: Attribute[];
  position: Position;
  // folded: boolean; // 折りたたみ状態
}

export interface Attribute {
  name: string;
  content: AttrContent | AttrContent[]; // 接続先のIDまたはテキストデータ
  inverse: boolean;
  edgePosition: Position; // エッジの接続位置
}

export interface AttrContent {
  type: string;
  value: string | number;
}

// attrName = undefined はノードの左上に接続されているとき
export interface Edge {
  id: string;
  from: {
    nodeId: number;
    attrName: string | undefined;
  };
  to: {
    nodeId: number;
    attrName: string | undefined;
  };
}

export interface Position {
  x: number;
  y: number;
}
