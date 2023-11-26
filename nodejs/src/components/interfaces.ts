export interface Node {
  id: number;
  type: string;
  attributes: Attribute[];
  position: Position;
  selected: boolean;
  // folded: boolean; // 折りたたみ状態
}

export interface Attribute {
  name: string;
  content: AttrContent | AttrContent[]; // 接続先のIDまたはテキストデータ
  inverse: boolean;
  visible: boolean; // 接続先の表示状態
  edgePosition?: Position; // エッジの接続位置
}

export interface AttrContent {
  type: string;
  value: string | number;
}

export interface Edge {
  id: string;
  from: {
    nodeId: number;
    attrName: string | undefined;
    // position: Position;
  };
  to: {
    nodeId: number;
    attrName: string | undefined;
    // position: Position;
  };
}

export interface Position {
  x: number;
  y: number;
}
