<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

import NodeComponent from "./NodeComponent.vue";
import EdgeComponent from "./EdgeComponent.vue";
import { IfcNode, Edge, Position, Attribute, SearchData } from "./interfaces";
import { hasValue } from "./utils";
import PropertyArea from "./PropertyArea.vue";
import SearchEntity from "./SearchEntity.vue";
import ToolbarComponent from "./ToolbarComponent.vue";
import ThemeToggle from "./ThemeToggle.vue";
import FitScreenIcon from "../assets/icons/fit-screen.svg";

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

// ノードとエッジのデータ
const nodes = ref<IfcNode[]>([]);
const edges = ref<Edge[]>([]);

// エッジの描画中の状態
const drawingEdge = ref<{ from: Position; to: Position } | null>(null);

// 属性表示用のノード
const viewedAttrNode = ref<IfcNode | null>(null);

// 選択されたノード
const selectedNodeIds = ref<string[]>([]);
// 範囲選択中に選択されたノード
const rectSelectedNodeIds = ref<string[]>([]);
// 範囲選択前に選択されていたノード
const previousSelectedNodeIds = ref<string[]>([]);

// ドラッグ中のノードの初期位置（ノード移動処理用）
const dragStartNodePositions = ref<{ [id: string]: Position }>({});

// IFCファイルの要素（右クリックメニュー表示用）
const ifcElements = ref<{ [key: string]: SearchData }>({});
const lookupElements = ref<{ [key: string]: SearchData } | null>(null);

// 右クリックメニュー表示フラグ
const showSearch = ref<boolean>(false);
let lookupTimeout: number | undefined;
let lookupRequestId = 0;

// ドラッグ中の位置を追跡するための状態
const dragging = ref(false);
const dragStartRelativePosition = ref<Position>({ x: 0, y: 0 });
const dragEndRelativePosition = ref<Position>({ x: 0, y: 0 });
const dragStartPosition = ref<Position>({ x: 0, y: 0 });
const dragEndPosition = ref<Position>({ x: 0, y: 0 });
const rectSelecting = ref(false);

// 右クリック位置
const nodeSpawnPosition = ref({ x: 0, y: 0 });

// アップロードしたファイルパス
const filepath = ref<string>("");
const fileInput = ref<HTMLInputElement | null>(null);
const viewFilename = ref<string>("");
const isLoading = ref(false);

// 描画領域の拡大縮小、移動
const scale = ref(1);
const position = ref({ x: 0, y: 0 });
const zoomContainer = ref<HTMLElement | null>(null);
const minScale = 0.1;
const maxScale = 2;
const zoomStep = 0.1;
const headerHeight = 44;
const zoomPercentLabel = computed(() => `${Math.round(scale.value * 100)}%`);
const canZoomIn = computed(() => scale.value < maxScale - 0.001);
const canZoomOut = computed(() => scale.value > minScale + 0.001);
const hasNodes = computed(() => nodes.value.length > 0);

// ドラッグオーバー時のハイライト表示用
const isDraggingOver = ref(false);

// サイドバーの幅（px）
const sidebarWidth = ref(window.innerWidth * 0.25); // 初期値: 25vw
const isResizingSidebar = ref(false);
const minSidebarWidth = 200;
const maxSidebarRatio = 0.75;

// .canvas の幅もサイドバーの幅に合わせて可変にする
const canvasWidth = computed(() => {
  return `calc(100vw - ${sidebarWidth.value}px)`;
});

function onSidebarHandleMouseDown(e: MouseEvent) {
  e.stopPropagation();
  e.preventDefault();
  isResizingSidebar.value = true;
  document.body.style.cursor = "ew-resize";
}

function onSidebarHandleMouseMove(e: MouseEvent) {
  if (!isResizingSidebar.value) return;
  const newWidth = window.innerWidth - e.clientX;
  sidebarWidth.value = Math.min(
    Math.max(newWidth, minSidebarWidth),
    window.innerWidth * maxSidebarRatio,
  );
}

function onSidebarHandleMouseUp() {
  if (isResizingSidebar.value) {
    isResizingSidebar.value = false;
    document.body.style.cursor = "auto";
  }
}

// ライフサイクルフック
onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("mousemove", onSidebarHandleMouseMove);
  window.addEventListener("mouseup", onSidebarHandleMouseUp);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("mousemove", onSidebarHandleMouseMove);
  window.removeEventListener("mouseup", onSidebarHandleMouseUp);
});

// キーボードイベントのハンドラ
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "Delete") {
    // 選択されたノードとそれに紐づくエッジを削除
    edges.value = edges.value.filter(
      (edge) =>
        !selectedNodeIds.value.includes(edge.from.nodeId) &&
        !selectedNodeIds.value.includes(edge.to.nodeId),
    );
    nodes.value = nodes.value.filter(
      (node) => !selectedNodeIds.value.includes(node.id),
    );
    selectedNodeIds.value = [];
  }
}

// ドラッグ操作のハンドラ（全体の移動処理、範囲選択）
function startDrag(event: MouseEvent) {
  if (event.button === 2) {
    // 右クリックは処理しない
    return;
  }

  // Shiftで範囲選択、それ以外は全体移動
  if (event.shiftKey) {
    rectSelecting.value = true;
    previousSelectedNodeIds.value = [...selectedNodeIds.value];
    rectSelectedNodeIds.value = [];
  } else {
    clearSelect(event);
  }

  dragging.value = true;
  dragStartRelativePosition.value = getRelativePosition(event);
  dragEndRelativePosition.value = { ...dragStartRelativePosition.value };
  dragStartPosition.value = { x: event.clientX, y: event.clientY };
  dragEndPosition.value = { x: event.clientX, y: event.clientY };
  // テキスト選択やスクロールを防ぐ
  document.body.style.userSelect = "none";
}

function drag(event: MouseEvent) {
  if (dragging.value) {
    if (rectSelecting.value) {
      // 選択範囲を描画
      dragEndPosition.value = { x: event.clientX, y: event.clientY };
      dragEndRelativePosition.value = getRelativePosition(event);
      const [x1, x2] = [
        dragStartRelativePosition.value.x,
        dragEndRelativePosition.value.x,
      ].sort((a, b) => a - b);
      const [y1, y2] = [
        dragStartRelativePosition.value.y,
        dragEndRelativePosition.value.y,
      ].sort((a, b) => a - b);

      // 選択範囲内のノードを選択
      nodes.value.forEach((node) => {
        const nodePosition = node.position;
        const left = nodePosition.x;
        const right = nodePosition.x + 200;
        const top = nodePosition.y;
        const length = node.attributes.filter((attr) =>
          hasValue(attr.content),
        ).length;
        // ヘッダーの高さ32px、bodyのpadding16px(上下各8px)、属性の高さ24px+margin4px=28px
        const bottom = nodePosition.y + 32 + 16 + 28 * length;

        // 選択開始前に選択済みのノードは処理しない
        if (!previousSelectedNodeIds.value.includes(node.id)) {
          if (!(x2 < left || right < x1) && !(y2 < top || bottom < y1)) {
            // 範囲内にあるノードを選択
            if (!rectSelectedNodeIds.value.includes(node.id)) {
              rectSelectedNodeIds.value.push(node.id);
              selectedNodeIds.value.push(node.id);
            }
          } else {
            // 範囲外にあるノードを選択解除
            if (rectSelectedNodeIds.value.includes(node.id)) {
              rectSelectedNodeIds.value = rectSelectedNodeIds.value.filter(
                (id) => id !== node.id,
              );
              selectedNodeIds.value = selectedNodeIds.value.filter(
                (id) => id !== node.id,
              );
            }
          }
        }
      });
    } else {
      // 全体を移動
      position.value.x += event.clientX - dragStartPosition.value.x;
      position.value.y += event.clientY - dragStartPosition.value.y;
      dragStartPosition.value = { x: event.clientX, y: event.clientY };
    }
  }
}

function endDrag() {
  dragging.value = false;
  rectSelecting.value = false;
  document.body.style.userSelect = "auto";
}

function clearCanvas() {
  nodes.value = [];
  edges.value = [];
  filepath.value = "";
  viewFilename.value = "";
  fileInput.value = null;

  isLoading.value = false;
  showSearch.value = false;
  viewedAttrNode.value = null;
  ifcElements.value = {};
  lookupElements.value = null;

  selectedNodeIds.value = [];
  rectSelectedNodeIds.value = [];
  previousSelectedNodeIds.value = [];
  dragStartNodePositions.value = {};
  drawingEdge.value = null;
  isDraggingOver.value = false;
  nodeSpawnPosition.value = { x: 0, y: 0 };
  zoomContainer.value = null;
  scale.value = 1;
  position.value = { x: 0, y: 0 };
  dragging.value = false;
  rectSelecting.value = false;
}

// ファイルのアップロード
const uploadFile = async (files: FileList | File[]) => {
  clearCanvas();

  // FormData オブジェクトを作成してファイルを追加
  const formData = new FormData();
  const fileArray = Array.from(files);
  fileArray.forEach((file) => {
    formData.append("files", file);
  });
  viewFilename.value = fileArray.map((f) => f.name).join(", ");
  isLoading.value = true;

  // ファイルをサーバーにアップロード
  try {
    const data = await postFormData<{
      searchData: { [key: string]: SearchData };
      root: any;
      path: string;
    }>(endpoint + "/upload", formData);
    ifcElements.value = data.searchData;
    const node = convertToNode(data.root);
    nodes.value.push(node);
    filepath.value = data.path;
    viewFilename.value = data.path.split("/").pop() ?? "";
    console.log(node);
  } catch (error) {
    // エラー処理
    console.error("ファイルのアップロードに失敗しました:", error);
  } finally {
    isLoading.value = false;
  }
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    uploadFile(target.files); // 選択されたファイルを処理
  }
};
const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    uploadFile(files); // 選択されたファイルを処理
  }
};

// レスポンスデータをNodeに変換
function convertToNode(data: any): IfcNode {
  const node: IfcNode = {
    id: data.id,
    type: data.type,
    reference: null,
    attributes: [],
    position: { x: 40, y: 60 },
  };

  // attributes
  let count = 0;
  for (const attr of data.attributes) {
    const attribute = {
      name: attr.name,
      content: attr.content,
      edgePosition: { x: attr.inverse ? 0 : 200, y: 52 + count * 28 },
      inverse: attr.inverse,
    };
    hasValue(attr.content) && count++;
    node.attributes.push(attribute);
  }

  if (data.references.content.value.length === 0) {
    return node;
  }
  const reference = {
    name: "Reference",
    content: data.references.content,
    edgePosition: { x: 0, y: 16 },
    inverse: true,
  };
  node.reference = reference;

  return node;
}

// ノードの位置を更新するハンドラ
const updateNodePosition = (moveDistance: { x: number; y: number }) => {
  nodes.value.forEach((node) => {
    // 選択されたノードのみ移動
    if (selectedNodeIds.value.includes(node.id)) {
      const startPosition = dragStartNodePositions.value[node.id];
      node.position.x = startPosition.x + moveDistance.x;
      node.position.y = startPosition.y + moveDistance.y;
    }
  });
};

// ノードの整列処理
const alignNodePosition = (
  align:
    | "left"
    | "center"
    | "right"
    | "top"
    | "middle"
    | "bottom"
    | "horizontal"
    | "vertical",
) => {
  if (selectedNodeIds.value.length <= 1) return;
  const selectedNodes = nodes.value.filter((node) =>
    selectedNodeIds.value.includes(node.id),
  );
  const xs = selectedNodes.map((node) => node.position.x);
  const ys = selectedNodes.map((node) => node.position.y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  if (align === "left") {
    setAlignNodePosition(selectedNodes, { x: minX });
  } else if (align === "center") {
    setAlignNodePosition(selectedNodes, { x: minX + (maxX - minX) / 2 });
  } else if (align === "right") {
    setAlignNodePosition(selectedNodes, { x: maxX });
  } else if (align === "top") {
    setAlignNodePosition(selectedNodes, { y: minY });
  } else if (align === "middle") {
    setAlignNodePosition(selectedNodes, { y: minY + (maxY - minY) / 2 });
  } else if (align === "bottom") {
    setAlignNodePosition(selectedNodes, { y: maxY });
  } else if (align === "horizontal") {
    const interval = (maxX - minX) / (selectedNodes.length - 1);
    selectedNodes.sort((a, b) => a.position.x - b.position.x);
    setAlignNodePosition(selectedNodes, { x: minX }, interval);
  } else if (align === "vertical") {
    const interval = (maxY - minY) / (selectedNodes.length - 1);
    selectedNodes.sort((a, b) => a.position.y - b.position.y);
    setAlignNodePosition(selectedNodes, { y: minY }, interval);
  }
};
const setAlignNodePosition = (
  selectedNodes: IfcNode[],
  { x = null, y = null }: { x?: number | null; y?: number | null },
  interval = 0,
) => {
  selectedNodes.forEach((node, idx) => {
    if (x !== null) node.position.x = x + interval * idx;
    if (y !== null) node.position.y = y + interval * idx;
  });
};

// エッジの位置を計算する
const edgePosition = computed(() => {
  /* パフォーマンス悪いかも */
  return edges.value.map((edge) => {
    const from = edge.from;
    const from_node = nodes.value.find((c) => c.id === from.nodeId);
    const from_attr = from_node?.attributes.find(
      (c) => c.name === from.attrName,
    );
    const from_edge = {
      x: (from_node?.position.x ?? 0) + (from_attr?.edgePosition.x ?? 0),
      y: (from_node?.position.y ?? 0) + (from_attr?.edgePosition.y ?? 16),
    };

    const to = edge.to;
    const to_node = nodes.value.find((c) => c.id === to.nodeId);
    const to_attr = to_node?.attributes.find((c) => c.name === to.attrName);
    const to_edge = {
      x: (to_node?.position.x ?? 0) + (to_attr?.edgePosition.x ?? 0),
      y: (to_node?.position.y ?? 0) + (to_attr?.edgePosition.y ?? 16),
    };

    return {
      id: edge.id,
      from: from_edge,
      to: to_edge,
    };
  });
});

// ノードの選択処理
const selectNode = (node: IfcNode, toggle = false) => {
  if (toggle) {
    // Shiftキーを押しながらの選択はトグル選択
    if (selectedNodeIds.value.includes(node.id)) {
      selectedNodeIds.value = selectedNodeIds.value.filter(
        (id) => id !== node.id,
      );
    } else {
      selectedNodeIds.value.push(node.id);
    }
  } else {
    // 未選択であれば選択
    if (!selectedNodeIds.value.includes(node.id)) {
      viewedAttrNode.value = node;
      selectedNodeIds.value = [node.id];
    }

    // 選択されたノードの初期位置を記録
    dragStartNodePositions.value = nodes.value.reduce(
      (obj, node) => {
        if (selectedNodeIds.value.includes(node.id)) {
          obj[node.id] = { ...node.position };
        }
        return obj;
      },
      {} as { [id: string]: Position },
    );
  }
};

// ノードを追加するハンドラ
const addNode_ = (
  srcId: string,
  dstId: string,
  srcName: string,
  inverse: boolean,
  dstPosition: Position,
  idx: number,
) => {
  isLoading.value = true;
  postJson<{ node: any }>(endpoint + "/get_node", {
    path: filepath.value,
    id: dstId,
  })
    .then((data) => {
      // レスポンスを処理
      const node = convertToNode(data.node);

      // 表示済みならノードを追加しない
      if (!nodes.value.find((c) => c.id === dstId)) {
        nodes.value.push(node);
      }

      // nodeIdと一致するattributeのnameを取得
      const targetAttr = node.attributes.find((attr) => {
        if (attr.content.type !== "id") return false;
        if (Array.isArray(attr.content.value)) {
          return attr.content.value.includes(srcId);
        } else {
          return attr.content.value === srcId;
        }
      });

      // ノードの位置をエッジ接続点を合わせるように更新
      // （ノードが複数あるときは重ならないように位置をずらす）
      const position = {
        x: dstPosition.x - (targetAttr?.edgePosition.x ?? 0) + idx * 10,
        y: dstPosition.y - (targetAttr?.edgePosition.y ?? 16) + idx * 10,
      };
      node.position = position;

      // エッジ作成
      const from: { nodeId: string; attrName: string | undefined } = {
        nodeId: "",
        attrName: "",
      };
      const to: { nodeId: string; attrName: string | undefined } = {
        nodeId: "",
        attrName: "",
      };
      if (inverse) {
        from.nodeId = dstId;
        from.attrName = targetAttr?.name;
        to.nodeId = srcId;
        to.attrName = srcName;
      } else {
        from.nodeId = srcId;
        from.attrName = srcName;
        to.nodeId = dstId;
        to.attrName = targetAttr?.name;
      }

      const id = `${from.nodeId}-${from.attrName}-${to.nodeId}-${to.attrName}`;
      if (edges.value.find((c) => c.id === id)) {
        return;
      }
      edges.value.push({
        id: id,
        from: from,
        to: to,
      });
    })
    .catch((error) => {
      console.log(error);
    })
    .finally(() => {
      // 描画中のエッジを削除
      updateDrawingEdge(null);
      isLoading.value = false;
    });
};

const addNode = (
  nodeId: string,
  data: { position: Position; attribute: Attribute },
) => {
  const id = data.attribute.content.value;
  const ids = Array.isArray(id) ? id : [id];
  ids.forEach((id, idx) => {
    addNode_(
      nodeId,
      id as string,
      data.attribute.name,
      data.attribute.inverse,
      data.position,
      idx,
    );
  });
};

// 描画中のエッジを更新する
const updateDrawingEdge = (edge: { from: Position; to: Position } | null) => {
  drawingEdge.value = edge;
};

// ホイールイベントのハンドラ
const handleWheel = (event: WheelEvent) => {
  event.preventDefault();
  const container = zoomContainer.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const wheelDelta = event.deltaY;
  const nextScale = scale.value + (wheelDelta > 0 ? -zoomStep : zoomStep);
  setScaleAroundPoint(nextScale, {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  });
};

const setScaleAroundPoint = (nextScale: number, point: Position) => {
  const previousScale = scale.value;
  const clampedScale = Math.min(Math.max(minScale, nextScale), maxScale);
  if (previousScale === clampedScale) return;

  const scaleChange = clampedScale - previousScale;
  scale.value = clampedScale;
  position.value.x -=
    (point.x - position.value.x) * (scaleChange / previousScale);
  position.value.y -=
    (point.y - position.value.y) * (scaleChange / previousScale);
};

const setScaleAroundCanvasCenter = (nextScale: number) => {
  const container = zoomContainer.value;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  setScaleAroundPoint(nextScale, {
    x: rect.width / 2,
    y: rect.height / 2,
  });
};

const zoomIn = () => {
  setScaleAroundCanvasCenter(scale.value + zoomStep);
};

const zoomOut = () => {
  setScaleAroundCanvasCenter(scale.value - zoomStep);
};

const getGraphBounds = () => {
  if (nodes.value.length === 0) {
    return null;
  }

  const nodeWidth = 200;
  return nodes.value.reduce(
    (acc, node) => {
      const nodeHeight =
        32 +
        16 +
        28 * node.attributes.filter((attr) => hasValue(attr.content)).length;
      const left = node.position.x;
      const right = node.position.x + nodeWidth;
      const top = node.position.y;
      const bottom = node.position.y + nodeHeight;

      return {
        minX: Math.min(acc.minX, left),
        maxX: Math.max(acc.maxX, right),
        minY: Math.min(acc.minY, top),
        maxY: Math.max(acc.maxY, bottom),
      };
    },
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
};

const fitToScreen = () => {
  const container = zoomContainer.value;
  const bounds = getGraphBounds();
  if (!container || !bounds) {
    return;
  }

  const graphWidth = Math.max(1, bounds.maxX - bounds.minX);
  const graphHeight = Math.max(1, bounds.maxY - bounds.minY);
  const padding = 40;
  const visibleTopInset = headerHeight;
  const availableWidth = Math.max(1, container.clientWidth - padding * 2);
  const availableHeight = Math.max(
    1,
    container.clientHeight - visibleTopInset - padding * 2,
  );
  const targetScale = Math.min(
    maxScale,
    Math.max(
      minScale,
      Math.min(availableWidth / graphWidth, availableHeight / graphHeight),
    ),
  );

  const graphCenter = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
  const viewportCenter = {
    x: container.clientWidth / 2,
    y: visibleTopInset + (container.clientHeight - visibleTopInset) / 2,
  };

  scale.value = targetScale;
  position.value = {
    x: viewportCenter.x - graphCenter.x * targetScale,
    y: viewportCenter.y - graphCenter.y * targetScale,
  };
};

const resetZoom = () => {
  const bounds = getGraphBounds();
  if (!bounds) {
    scale.value = 1;
    position.value = { x: 0, y: 0 };
    return;
  }

  const container = zoomContainer.value;
  if (!container) {
    scale.value = 1;
    return;
  }

  const viewportCenter = {
    x: container.clientWidth / 2,
    y: container.clientHeight / 2,
  };
  const graphCenter = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };

  scale.value = 1;
  position.value = {
    x: viewportCenter.x - graphCenter.x,
    y: viewportCenter.y - graphCenter.y,
  };
};

// ノード以外の領域をクリックした場合に選択を解除する
const clearSelect = (event: MouseEvent) => {
  viewedAttrNode.value = null;
  const targetElement = event.target as Element;
  if (!targetElement.closest(".node")) {
    selectedNodeIds.value = [];
  }
};

const selectEntity = (id: string) => {
  // 選択された項目の処理
  addNodeById(id, { ...nodeSpawnPosition.value });
};
const addNodeById = (id: string, dstPosition: Position) => {
  isLoading.value = true;
  postJson<{ node: any }>(endpoint + "/get_node", {
    path: filepath.value,
    id,
  })
    .then((data) => {
      // レスポンスを処理
      const node = convertToNode(data.node);

      // 表示済みならノードを追加しない
      if (!nodes.value.find((c) => c.id === node.id)) {
        node.position = dstPosition;
        nodes.value.push(node);
      }
    })
    .catch((error) => {
      console.log(error);
    })
    .finally(() => {
      isLoading.value = false;
    });
};

const getRelativePosition = (event: MouseEvent) => {
  const container = zoomContainer.value;
  if (!container) return { x: 0, y: 0 };

  const rect = container.getBoundingClientRect();

  // 要素内でのマウスの相対座標
  const relativeX =
    (event.clientX - rect.left - position.value.x) / scale.value;
  const relativeY = (event.clientY - rect.top - position.value.y) / scale.value;

  return { x: relativeX, y: relativeY };
};

const openHeaderSearch = () => {
  if (showSearch.value) {
    closeSearch();
    return;
  }
  // ノードをキャンバスの左上付近に配置する
  const container = zoomContainer.value;
  if (container) {
    const leftX = (40 - position.value.x) / scale.value;
    const topY = (80 - position.value.y) / scale.value;
    nodeSpawnPosition.value = { x: leftX, y: topY };
  }
  showSearch.value = true;
};

const closeSearch = () => {
  showSearch.value = false;
  if (lookupTimeout !== undefined) {
    window.clearTimeout(lookupTimeout);
    lookupTimeout = undefined;
  }
  clearLookup();
};

const isNumericIdQuery = (value: string) => /^[0-9]+$/.test(value);
const isGlobalIdQuery = (value: string) => /^[A-Za-z0-9_$]{22}$/.test(value);
const isUuidQuery = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value,
  );
const getLookupKey = (value: string, path: string) => {
  if (path.endsWith(".ifc")) {
    if (isNumericIdQuery(value)) return "id";
    if (isGlobalIdQuery(value)) return "globalId";
  }
  if (path.endsWith(".ifcx")) {
    if (isUuidQuery(value)) return "id";
  }
  return null;
};

const clearLookup = () => {
  lookupRequestId += 1;
  lookupElements.value = null;
};

const resetLookupResults = () => {
  lookupElements.value = {};
};

const handleSearchQuery = (value: string) => {
  const trimmed = value.trim();
  if (lookupTimeout !== undefined) {
    window.clearTimeout(lookupTimeout);
    lookupTimeout = undefined;
  }

  const key = getLookupKey(trimmed, filepath.value);
  if (trimmed.length === 0 || key === null) {
    clearLookup();
    return;
  }

  const requestId = ++lookupRequestId;
  resetLookupResults();

  lookupTimeout = window.setTimeout(async () => {
    try {
      const response = await postJson<{
        items?: SearchData["items"];
        entityType?: string;
      }>(endpoint + "/lookup_entity", {
        path: filepath.value,
        key,
        value: trimmed,
      });
      if (requestId !== lookupRequestId) {
        return;
      }
      const items = response.items ?? [];
      const entityType = response.entityType ?? "";
      if (items.length > 0 && entityType) {
        lookupElements.value = { [entityType]: { items } };
      } else {
        resetLookupResults();
      }
    } catch (error) {
      if (requestId !== lookupRequestId) {
        return;
      }
      resetLookupResults();
    }
  }, 250);
};

// ドラッグオーバーイベントのハンドラ
const handleDragEvent = (event: DragEvent, isOver: boolean) => {
  if (event.dataTransfer?.types?.includes("Files")) {
    event.stopPropagation();
    event.preventDefault();
    isDraggingOver.value = isOver;
  }
};

const handleDragEnter = (event: DragEvent) => handleDragEvent(event, true);

const handleDragLeave = (event: DragEvent) => handleDragEvent(event, false);

const handleDragOver = (event: DragEvent) => {
  // For dragover, browsers usually need preventDefault to allow drop
  if (event.dataTransfer?.types?.includes("Files")) {
    event.preventDefault();
    isDraggingOver.value = true;
  }
};
</script>

<template>
  <div
    class="file-drop-area"
    @dragenter.prevent
    @dragover.prevent
    @drop="handleDrop"
    @click="triggerFileInput"
    v-if="filepath === ''"
  >
    <div class="drop-content">
      <div class="drop-icon">📂</div>
      <p class="drop-title">Drop IFC / IFCX file here</p>
      <p class="drop-sub">or click to browse</p>
    </div>
    <input
      type="file"
      ref="fileInput"
      @change="handleFileSelect"
      class="hidden-input"
    />
  </div>

  <!-- Header bar (shown when a file is loaded) -->
  <div class="app-header" v-if="filepath !== ''">
    <span class="filename-badge" :title="viewFilename">{{ viewFilename }}</span>
    <div class="header-center">
      <button
        class="header-search-btn"
        :class="{ active: showSearch }"
        :disabled="Object.keys(ifcElements).length === 0"
        :title="
          Object.keys(ifcElements).length === 0
            ? 'Loading search data…'
            : 'Search entities'
        "
        @click="openHeaderSearch"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Search
      </button>
    </div>
    <div class="header-right">
      <div class="zoom-controls" title="Zoom controls">
        <button
          class="zoom-btn"
          type="button"
          :disabled="!canZoomOut"
          @click="zoomOut"
          title="Zoom out"
        >
          -
        </button>
        <button
          class="zoom-level"
          type="button"
          @click="resetZoom"
          title="Reset zoom to 100% and center graph"
        >
          {{ zoomPercentLabel }}
        </button>
        <button
          class="zoom-btn"
          type="button"
          :disabled="!canZoomIn"
          @click="zoomIn"
          title="Zoom in"
        >
          +
        </button>
        <button
          class="zoom-fit"
          type="button"
          :disabled="!hasNodes"
          @click="fitToScreen"
          aria-label="Fit all nodes to screen"
          title="Fit all nodes to screen"
        >
          <FitScreenIcon class="zoom-fit-icon" width="14" height="14" />
        </button>
      </div>
      <ThemeToggle />
    </div>
  </div>

  <!-- Search dropdown (fixed below header, outside canvas) -->
  <template v-if="showSearch && Object.keys(ifcElements).length > 0">
    <div class="search-backdrop" @click="closeSearch"></div>
    <div class="search-dropdown">
      <SearchEntity
        :elements="ifcElements"
        :lookup-elements="lookupElements"
        @select="selectEntity"
        @query="handleSearchQuery"
      />
    </div>
  </template>

  <!-- Processing overlay -->
  <div :class="['loading-overlay', { active: isLoading }]">
    <div class="spinner"></div>
    <span>Processing…</span>
  </div>

  <div
    class="container"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
    :class="{ 'drag-over': isDraggingOver && filepath !== '' }"
  >
    <div
      class="sidebar-resize-handle"
      :style="{ right: sidebarWidth + 'px' }"
      @mousedown="onSidebarHandleMouseDown"
    ></div>
    <div
      class="canvas"
      :style="{ width: canvasWidth }"
      @mousedown="startDrag"
      @mousemove="drag"
      @mouseup="endDrag"
      @mouseleave="endDrag"
      @wheel="handleWheel"
      @contextmenu.prevent
      ref="zoomContainer"
    >
      <!-- Edges -->
      <svg class="edge-container" xmlns="http://www.w3.org/2000/svg">
        <g
          :style="{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }"
        >
          <EdgeComponent
            v-for="edge in edgePosition"
            :key="edge.id"
            :from="edge.from"
            :to="edge.to"
          />
          <!-- Drawing edge -->
          <EdgeComponent
            v-if="drawingEdge !== null"
            :from="drawingEdge.from"
            :to="drawingEdge.to"
            :dashed="true"
          />
        </g>
      </svg>

      <!-- Nodes -->
      <div
        class="node-container"
        :style="{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        }"
      >
        <NodeComponent
          v-for="(node, _) in nodes"
          :key="node.id"
          :node="node"
          :selected="selectedNodeIds.includes(node.id)"
          :scale="scale"
          @update:position="updateNodePosition($event)"
          @add:node="addNode(node.id, $event)"
          @select:node="selectNode(node, $event)"
          @update:drawingEdgePosition="updateDrawingEdge($event)"
        />
      </div>

      <!-- Selection rectangle -->
      <div
        v-show="rectSelecting"
        class="selection-rectangle"
        :style="{
          left: `${Math.min(dragStartPosition.x, dragEndPosition.x)}px`,
          top: `${Math.min(dragStartPosition.y, dragEndPosition.y)}px`,
          width: `${Math.abs(dragEndPosition.x - dragStartPosition.x)}px`,
          height: `${Math.abs(dragEndPosition.y - dragStartPosition.y)}px`,
        }"
      ></div>

      <!-- Toolbar -->
      <ToolbarComponent @align:node="alignNodePosition($event)" />
    </div>

    <!-- Property sidebar -->
    <div class="sidebar" :style="{ width: sidebarWidth + 'px' }">
      <div v-if="viewedAttrNode">
        <PropertyArea :node="viewedAttrNode" />
      </div>
      <div v-else class="sidebar-empty">
        <span>Select a node to view its properties</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ───────────────────────────────────────────────── */
.container {
  display: flex;
  height: 100vh;
}

/* ── File Drop Area ───────────────────────────────────────── */
.file-drop-area {
  position: fixed;
  inset: 0;
  z-index: 3;
  background-color: var(--bg-surface);
  border: 2px dashed var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}

.file-drop-area:hover {
  background-color: var(--bg-panel);
  border-color: var(--accent);
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.drop-icon {
  font-size: 3rem;
  line-height: 1;
}

.drop-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.drop-sub {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.hidden-input {
  display: none;
}

/* ── App Header ───────────────────────────────────────────── */
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  pointer-events: none;
}

.app-header > * {
  pointer-events: auto;
}

.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
}

.filename-badge {
  display: inline-flex;
  align-items: center;
  max-width: 40vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 3px 10px;
}

/* Header search button */
.header-search-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s,
    border-color 0.15s;
  white-space: nowrap;
}

.header-search-btn:hover:not(:disabled) {
  background-color: var(--accent-subtle);
  color: var(--accent);
  border-color: var(--accent);
}

.header-search-btn.active {
  background-color: var(--accent-subtle);
  color: var(--accent);
  border-color: var(--accent);
}

.header-search-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Right-side header group (search btn + theme toggle) */
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zoom-controls {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-panel);
}

.zoom-btn,
.zoom-level,
.zoom-fit {
  height: 24px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 0.78rem;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s,
    border-color 0.15s;
}

.zoom-btn {
  width: 24px;
  font-weight: 700;
}

.zoom-level {
  min-width: 64px;
  padding: 0 8px;
  font-weight: 600;
}

.zoom-fit {
  width: 28px;
  min-width: 28px;
  padding: 0;
  font-weight: 600;
}

.zoom-fit-icon {
  display: block;
  margin: 0 auto;
}

.zoom-btn:hover:not(:disabled),
.zoom-level:hover:not(:disabled),
.zoom-fit:hover:not(:disabled) {
  background-color: var(--accent-subtle);
  color: var(--accent);
  border-color: var(--accent);
}

.zoom-btn:disabled,
.zoom-fit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Theme toggle is now inside the header; no separate fixed wrapper needed */

/* ── Loading Overlay ──────────────────────────────────────── */
.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background-color: var(--overlay-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #ffffff;
  font-size: 1rem;
  letter-spacing: 0.02em;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.3s ease,
    visibility 0.3s ease;
}

.loading-overlay.active {
  opacity: 1;
  visibility: visible;
}

/* Spinner */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ── Canvas ───────────────────────────────────────────────── */
.canvas {
  height: 100vh;
  overflow: auto;
  position: relative;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
  background-color: var(--bg-canvas);
  background-image: radial-gradient(var(--grid-dot) 1px, transparent 1px);
  background-size: 24px 24px;
}

.canvas::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.canvas::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

.canvas::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb);
  border-radius: 999px;
  border: 3px solid var(--scrollbar-track);
}

.canvas::-webkit-scrollbar-thumb:hover {
  background-color: var(--scrollbar-thumb-hover);
}

.canvas::-webkit-scrollbar-corner {
  background: var(--scrollbar-track);
}

/* ── Sidebar ──────────────────────────────────────────────── */
.sidebar {
  position: fixed;
  top: 44px;
  /* below header */
  right: 0;
  height: calc(100vh - 44px);
  z-index: 2;
  word-wrap: break-word;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
  background-color: var(--bg-surface);
  border-left: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
}

.sidebar::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.sidebar::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

.sidebar::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb);
  border-radius: 999px;
  border: 3px solid var(--scrollbar-track);
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background-color: var(--scrollbar-thumb-hover);
}

.sidebar::-webkit-scrollbar-corner {
  background: var(--scrollbar-track);
}

.sidebar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  padding: 24px;
  color: var(--text-muted);
  font-size: 0.8rem;
  text-align: center;
}

/* ── Sidebar Resize Handle ────────────────────────────────── */
.sidebar-resize-handle {
  position: fixed;
  top: 44px;
  width: 4px;
  height: calc(100vh - 44px);
  cursor: ew-resize;
  background: var(--border-color);
  z-index: 3;
  opacity: 0.5;
  transition:
    opacity 0.15s,
    background 0.15s;
}

.sidebar-resize-handle:hover {
  background: var(--accent);
  opacity: 0.8;
}

/* ── Node & Edge Containers ───────────────────────────────── */
.node-container {
  transform-origin: 0 0;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.edge-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* ── Selection Rectangle ──────────────────────────────────── */
.selection-rectangle {
  position: absolute;
  border: 2px dashed var(--selection-border);
  background-color: var(--selection-bg);
  pointer-events: none;
}

/* ── Search Dropdown & Backdrop ──────────────────────────── */
.search-backdrop {
  position: fixed;
  inset: 0;
  z-index: 14;
}

.search-dropdown {
  position: fixed;
  top: 52px;
  /* below 44px header + 8px gap */
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
}

/* ── Search Loading ───────────────────────────────────────── */

/* ── Drag-over Overlay ────────────────────────────────────── */
.container.drag-over::after {
  content: "";
  position: absolute;
  inset: 0;
  background-color: var(--accent-subtle);
  border: 2px dashed var(--accent);
  z-index: 10;
  pointer-events: none;
}
</style>
