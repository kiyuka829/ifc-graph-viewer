export interface Node {
  id: string;
  type: string;
  attributes: Attribute[];
  position: Position;
  // folded: boolean; // 折りたたみ状態
}

export interface Attribute {
  name: string;
  content: string | string[]; // 接続先のIDまたはテキストデータ
  inverse: boolean;
  visible: boolean; // 接続先の表示状態
  edgePosition?: Position; // エッジの接続位置
}

export interface Edge {
  id: string;
  from: {
    nodeId: string;
    attrName: string;
    // position: Position;
  };
  to: {
    nodeId: string;
    attrName: string;
    // position: Position;
  };
}

export interface Position {
  x: number;
  y: number;
}
