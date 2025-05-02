<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import axios from "axios";

import NodeComponent from "./NodeComponent.vue";
import EdgeComponent from "./EdgeComponent.vue";
import { IfcNode, Edge, Position, Attribute, SearchData } from "./interfaces";
import { hasValue } from "./utils";
import PropertyArea from "./PropertyArea.vue";
import SearchEntity from "./SearchEntity.vue";
import ToolbarComponent from "./ToolbarComponent.vue";

const endpoint = import.meta.env.VITE_API_ENDPOINT as string;

// ノードとエッジのデータ
const nodes = ref<IfcNode[]>([]);
const edges = ref<Edge[]>([]);

// エッジの描画中の状態
const drawingEdge = ref<{ from: Position; to: Position } | null>(null);

// 属性表示用のノード
const viewedAttrNode = ref<IfcNode | null>(null);

// 選択されたノード
const selectedNodeIds = ref<number[]>([]);
// 範囲選択中に選択されたノード
const rectSelectedNodeIds = ref<number[]>([]);
// 範囲選択前に選択されていたノード
const previousSelectedNodeIds = ref<number[]>([]);

// ドラッグ中のノードの初期位置（ノード移動処理用）
const dragStartNodePositions = ref<{ [id: number]: Position }>({});

// IFCファイルの要素（右クリックメニュー表示用）
const ifcElements = ref<{ [key: string]: SearchData }>({});

// 右クリックメニュー表示フラグ
const showSearch = ref<boolean>(false);

// ドラッグ中の位置を追跡するための状態
const dragging = ref(false);
const dragStartRelativePosition = ref<Position>({ x: 0, y: 0 });
const dragEndRelativePosition = ref<Position>({ x: 0, y: 0 });
const dragStartPosition = ref<Position>({ x: 0, y: 0 });
const dragEndPosition = ref<Position>({ x: 0, y: 0 });
const rectSelecting = ref(false);

// 右クリック位置
const rightClickPosition = ref({ x: 0, y: 0 });

// アップロードしたファイルパス
const filepath = ref<string>("");
const fileInput = ref<HTMLInputElement | null>(null);
const viewFilename = ref<string>("");
const isLoading = ref(false);

// 描画領域の拡大縮小、移動
const scale = ref(1);
const position = ref({ x: 0, y: 0 });
const zoomContainer = ref<HTMLElement | null>(null);

// ドラッグオーバー時のハイライト表示用
const isDraggingOver = ref(false);

// ライフサイクルフック
onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});

// キーボードイベントのハンドラ
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "Delete") {
    // 選択されたノードとそれに紐づくエッジを削除
    edges.value = edges.value.filter(
      (edge) =>
        !selectedNodeIds.value.includes(edge.from.nodeId) &&
        !selectedNodeIds.value.includes(edge.to.nodeId)
    );
    nodes.value = nodes.value.filter(
      (node) => !selectedNodeIds.value.includes(node.id)
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
          hasValue(attr.contents)
        ).length;
        // ヘッダーの高さ44px、bodyのpadding20px、属性の高さ29px
        const bottom = nodePosition.y + 44 + 20 + 29 * length;

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
                (id) => id !== node.id
              );
              selectedNodeIds.value = selectedNodeIds.value.filter(
                (id) => id !== node.id
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

// ファイルのアップロード
const uploadFile = (file: File) => {
  // FormData オブジェクトを作成してファイルを追加
  const formData = new FormData();
  formData.append("file", file);
  viewFilename.value = file.name;
  isLoading.value = true;

  // ファイルをサーバーにアップロード
  axios
    .post(endpoint + "/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .then((response) => {
      // レスポンスを処理
      ifcElements.value = response.data.searchData;
      const node = convertToNode(response.data.root);
      nodes.value.push(node);
      filepath.value = response.data.path;
      console.log(node);
    })
    .catch((error) => {
      // エラー処理
      console.error("ファイルのアップロードに失敗しました:", error);
    })
    .finally(() => {
      isLoading.value = false;
    });
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    uploadFile(target.files[0]); // 選択されたファイルを処理
  }
};
const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    uploadFile(files[0]); // 選択されたファイルを処理
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
      contents: attr.contents,
      edgePosition: { x: attr.inverse ? 0 : 200, y: 68 + count * 29 },
      inverse: attr.inverse,
    };
    hasValue(attr.contents) && count++;
    node.attributes.push(attribute);
  }

  if (data.references.contents.length === 0) {
    return node;
  }
  const reference = {
    name: "Reference",
    contents: data.references.contents,
    edgePosition: { x: 0, y: 25 },
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
    | "vertical"
) => {
  if (selectedNodeIds.value.length <= 1) return;
  const selectedNodes = nodes.value.filter((node) =>
    selectedNodeIds.value.includes(node.id)
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
  interval = 0
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
      (c) => c.name === from.attrName
    );
    const from_edge = {
      x: (from_node?.position.x ?? 0) + (from_attr?.edgePosition.x ?? 0),
      y: (from_node?.position.y ?? 0) + (from_attr?.edgePosition.y ?? 22.5),
    };

    const to = edge.to;
    const to_node = nodes.value.find((c) => c.id === to.nodeId);
    const to_attr = to_node?.attributes.find((c) => c.name === to.attrName);
    const to_edge = {
      x: (to_node?.position.x ?? 0) + (to_attr?.edgePosition.x ?? 0),
      y: (to_node?.position.y ?? 0) + (to_attr?.edgePosition.y ?? 22.5),
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
        (id) => id !== node.id
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
    dragStartNodePositions.value = nodes.value.reduce((obj, node) => {
      if (selectedNodeIds.value.includes(node.id)) {
        obj[node.id] = { ...node.position };
      }
      return obj;
    }, {} as { [id: number]: Position });
  }
};

// ノードを追加するハンドラ
const addNode_ = (
  srcId: number,
  dstId: number,
  srcName: string,
  inverse: boolean,
  dstPosition: Position,
  idx: number
) => {
  const config = {
    method: "post",
    url: endpoint + "/get_node",
    data: {
      path: filepath.value,
      id: dstId,
    },
  };

  isLoading.value = true;
  axios(config)
    .then((response) => {
      // レスポンスを処理
      // console.log(response.data);
      const node = convertToNode(response.data.node);

      // 表示済みならノードを追加しない
      if (!nodes.value.find((c) => c.id === dstId)) {
        nodes.value.push(node);
      }

      // nodeIdと一致するattributeのnameを取得
      const targetAttr = node.attributes.find((attr) => {
        if (attr.contents.find((c) => c.type === "id" && c.value === srcId)) {
          return true;
        }
      });

      // ノードの位置をエッジ接続点を合わせるように更新
      // （ノードが複数あるときは重ならないように位置をずらす）
      const position = {
        x: dstPosition.x - (targetAttr?.edgePosition.x ?? 0) + idx * 10,
        y: dstPosition.y - (targetAttr?.edgePosition.y ?? 22.5) + idx * 10,
      };
      node.position = position;

      // エッジ作成
      const from: { nodeId: number; attrName: string | undefined } = {
        nodeId: 0,
        attrName: "",
      };
      const to: { nodeId: number; attrName: string | undefined } = {
        nodeId: 0,
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
  nodeId: number,
  data: { position: Position; attribute: Attribute }
) => {
  // console.log(data);
  const id = data.attribute.contents;
  const ids = Array.isArray(id) ? id : [id];
  ids.forEach((id, idx) => {
    addNode_(
      nodeId,
      id.value as number,
      data.attribute.name,
      data.attribute.inverse,
      data.position,
      idx
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

  const previousScale = scale.value;

  const zoomIntensity = 0.1;
  const wheelDelta = event.deltaY;
  // ズームインまたはズームアウト
  const scaleChange = wheelDelta > 0 ? -zoomIntensity : zoomIntensity;
  // スケールが小さすぎるか大きすぎないように制限する
  scale.value = Math.min(Math.max(0.1, scale.value + scaleChange), 2);
  if (previousScale === scale.value) return;

  // スケール変更に基づいて位置を調整
  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  position.value.x -= (x - position.value.x) * (scaleChange / previousScale);
  position.value.y -= (y - position.value.y) * (scaleChange / previousScale);
};

// ノード以外の領域をクリックした場合に選択を解除する
const clearSelect = (event: MouseEvent) => {
  viewedAttrNode.value = null;
  const targetElement = event.target as Element;
  if (!targetElement.closest(".node")) {
    selectedNodeIds.value = [];
  }
};

const selectEntity = (id: number) => {
  // 選択された項目の処理
  addNodeById(id, { ...rightClickPosition.value });
};
const addNodeById = (id: number, dstPosition: Position) => {
  const config = {
    method: "post",
    url: endpoint + "/get_node",
    data: {
      path: filepath.value,
      id: id,
    },
  };

  isLoading.value = true;
  axios(config)
    .then((response) => {
      // レスポンスを処理
      const node = convertToNode(response.data.node);

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

const handleRightClick = (event: MouseEvent) => {
  event.preventDefault(); // デフォルトのコンテキストメニューを防ぐ
  const relativePosition = getRelativePosition(event);
  rightClickPosition.value = relativePosition;
  showSearch.value = true;
};

const closeSearch = () => {
  showSearch.value = false;
};

// ドラッグオーバーイベントのハンドラ
const handleDragEnter = (event: DragEvent) => {
  event.preventDefault();
  isDraggingOver.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  isDraggingOver.value = false;
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  isDraggingOver.value = true;
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
    Drag & Drop or Click
    <input
      type="file"
      ref="fileInput"
      @change="handleFileSelect"
      class="hidden-input"
    />
  </div>
  <h4 v-else class="fileInput" style="margin-top: 0">
    {{ viewFilename }}
  </h4>

  <!-- 処理中の表示 -->
  <div :class="['loading-overlay', { active: isLoading }]">Processing...</div>

  <div
    class="container"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
    :class="{ 'drag-over': isDraggingOver && filepath !== '' }"
  >
    <div
      class="canvas"
      @mousedown="startDrag"
      @mousemove="drag"
      @mouseup="endDrag"
      @mouseleave="endDrag"
      @wheel="handleWheel"
      @contextmenu.prevent="handleRightClick"
      ref="zoomContainer"
    >
      <!-- エッジ -->
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

          <!-- 追加途中のエッジ -->
          <EdgeComponent
            v-if="drawingEdge !== null"
            :from="drawingEdge.from"
            :to="drawingEdge.to"
            :dashed="true"
          />
        </g>
      </svg>

      <!-- ノード -->
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

      <!-- 選択ボックス -->
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

      <!-- ツールバー -->
      <ToolbarComponent @align:node="alignNodePosition($event)" />
    </div>

    <!-- 属性表示欄 -->
    <div class="sidebar">
      <div v-if="viewedAttrNode">
        <PropertyArea :node="viewedAttrNode" />
      </div>
    </div>

    <!-- ノード追加メニュー -->
    <template v-if="Object.keys(ifcElements).length === 0">
      <div class="search-loading-text">Loading search data...</div>
    </template>
    <template v-else>
      <div class="add-menu" v-if="showSearch" @click="closeSearch">
        <SearchEntity :elements="ifcElements" @select="selectEntity" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  height: 100vh;
}

.file-drop-area {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 3;
  width: 100%;
  height: 100vh;
  background-color: #f0f0f0;
  border: 5px dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #aaa;
  cursor: pointer;
}

.file-drop-area:hover {
  background-color: #f9f9f9;
}

.fileInput {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1;
}

.hidden-input {
  display: none;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5); /* 半透明の背景 */
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5em;
  z-index: 1000; /* 他の要素より前面に表示 */
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.loading-overlay.active {
  opacity: 1;
  visibility: visible;
}

.canvas {
  width: 75vw;
  height: 100vh;
  overflow: auto;
  position: relative;
}

.sidebar {
  position: absolute;
  top: 0;
  right: 0;
  /* 1/4 of the screen width */
  width: 25vw;
  /* Full height of the container */
  height: 100vh;
  /* Overlay on top of the canvas */
  z-index: 2;
  /* 長い単語でも折り返しを行う */
  word-wrap: break-word;
  /* 必要に応じてスクロールバーを表示 */
  overflow: auto;
  background-color: #f0f0f0;
}

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

.selection-rectangle {
  position: absolute;
  border: 2px dashed #4a90e2; /* 青い点線の境界線 */
  background-color: rgba(74, 144, 226, 0.3); /* 半透明の青色背景 */
}

.add-menu {
  position: absolute;
  overflow: auto;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.align-icons {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.align-icon {
  padding: 3px;
  cursor: pointer;
}

.align-icon:hover {
  background-color: rgba(129, 129, 129, 0.3);
}

.search-loading-text {
  position: absolute;
  z-index: -1;
  top: 60px;
  left: 20px;
  width: 200px;
  text-align: left;
  color: gray;
  font-style: italic;
  padding: 8px 0;
}

/* ドラッグオーバー時のハイライト表示 */
.container.drag-over::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 10;
  pointer-events: none; /* マウスイベントを下層に通す */
}
</style>
