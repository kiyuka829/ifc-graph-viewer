<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import axios from "axios";
import NodeComponent from "./NodeComponent.vue";
import EdgeComponent from "./EdgeComponent.vue";
import { Node, Edge, Position, Attribute } from "./interfaces";
import { hasValue } from "./utils";
import PropertyArea from "./PropertyArea.vue";
import SearchEntity from "./SearchEntity.vue";

const endpoint = import.meta.env.VITE_API_ENDPOINT as string;

// ノードとエッジのデータ
const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);

// エッジの描画中の状態
const drawingEdge = ref<{ from: Position; to: Position } | null>(null);

// 選択されたノード（属性表示用）
const selectedNode = ref<Node | null>(null);

// IFCファイルの要素（右クリックメニュー表示用）
const ifcElements = ref<{ [key: string]: number[] }>({});

// 右クリックメニュー表示フラグ
const showSearch = ref<boolean>(false);

// ドラッグ中の位置を追跡するための状態
const dragging = ref(false);
let start = { x: 0, y: 0 };

// 右クリック位置
const rightClickPosition = ref({ x: 0, y: 0 });

// アップロードしたファイルパス
const filepath = ref<string>("");

// 描画領域の拡大縮小、移動
const scale = ref(1);
const position = ref({ x: 0, y: 0 });
const zoomContainer = ref<HTMLElement | null>(null);

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
        !nodes.value.find((node) => node.id === edge.from.nodeId)?.selected &&
        !nodes.value.find((node) => node.id === edge.to.nodeId)?.selected
    );
    nodes.value = nodes.value.filter((node) => !node.selected);
  }
}

// ドラッグ操作のハンドラ
function startDrag(event: MouseEvent) {
  if (event.button === 2) {
    // 右クリックは処理しない
    return;
  }
  clearSelect(event);

  dragging.value = true;
  start = { x: event.clientX, y: event.clientY };
  // テキスト選択やスクロールを防ぐ
  document.body.style.userSelect = "none";
}

function drag(event: MouseEvent) {
  if (dragging.value) {
    position.value.x += event.clientX - start.x;
    position.value.y += event.clientY - start.y;
    start = { x: event.clientX, y: event.clientY };
  }
}

function endDrag() {
  dragging.value = false;
  document.body.style.userSelect = "auto";
}

// ファイルのアップロード
const uploadFile = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    const selectedFile = input.files[0];

    // FormData オブジェクトを作成してファイルを追加
    const formData = new FormData();
    formData.append("file", selectedFile);

    // ファイルをサーバーにアップロード
    axios
      .post(endpoint + "/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => {
        // レスポンスを処理
        ifcElements.value = response.data.entities;
        const node = convertToNode(response.data.model);
        nodes.value.push(node);
        filepath.value = response.data.path;
        console.log(node);
      })
      .catch((error) => {
        // エラー処理
        console.error("ファイルのアップロードに失敗しました:", error);
      });
  }
};

// レスポンスデータをNodeに変換
function convertToNode(data: any): Node {
  const node: Node = {
    id: data.id,
    type: data.type,
    attributes: [],
    position: { x: 40, y: 60 },
    selected: false,
  };

  // attributes
  let count = 0;
  for (const attr of data.attributes) {
    const attribute = {
      name: attr.name,
      content: attr.content,
      edgePosition: { x: attr.inverse ? 0 : 200, y: 68 + count * 29 },
      inverse: attr.inverse,
      visible: true,
    };
    hasValue(attr.content) && count++;
    node.attributes.push(attribute);
  }

  return node;
}

// ノードの位置を更新するハンドラ
const updateNodePosition = (
  nodeId: number,
  newPosition: { x: number; y: number }
) => {
  const node = nodes.value.find((c) => c.id === nodeId);
  if (node) {
    node.position = newPosition;
  }
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
      x: (from_node?.position.x ?? 0) + (from_attr?.edgePosition?.x ?? 0),
      y: (from_node?.position.y ?? 0) + (from_attr?.edgePosition?.y ?? 22.5),
    };

    const to = edge.to;
    const to_node = nodes.value.find((c) => c.id === to.nodeId);
    const to_attr = to_node?.attributes.find((c) => c.name === to.attrName);
    const to_edge = {
      x: (to_node?.position.x ?? 0) + (to_attr?.edgePosition?.x ?? 0),
      y: (to_node?.position.y ?? 0) + (to_attr?.edgePosition?.y ?? 22.5),
    };

    return {
      id: edge.id,
      from: from_edge,
      to: to_edge,
    };
  });
});

// ノードの選択処理
const selectNode = (node: Node) => {
  selectedNode.value = node;
};

// ノードを追加するハンドラ
const addNode_ = (
  srcId: number,
  dstId: number,
  srcName: string,
  inverse: boolean,
  dstPosition: Position
) => {
  const config = {
    method: "post",
    url: endpoint + "/get_node",
    data: {
      path: filepath.value,
      id: dstId,
    },
  };
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
        if (Array.isArray(attr.content)) {
          if (attr.content.find((c) => c.type === "id" && c.value === srcId)) {
            return true;
          }
        } else {
          return attr.content.type === "id" && attr.content.value === srcId;
        }
      });

      // ノードの位置をエッジ接続点を合わせるように更新
      const position = {
        x: dstPosition.x - (targetAttr?.edgePosition?.x ?? 0),
        y: dstPosition.y - (targetAttr?.edgePosition?.y ?? 22.5),
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
    });
};

const addNode = (
  nodeId: number,
  data: { position: Position; attribute: Attribute }
) => {
  // console.log(data);
  const id = data.attribute.content;
  const ids = Array.isArray(id) ? id : [id];
  ids.forEach((id) => {
    addNode_(
      nodeId,
      id.value as number,
      data.attribute.name,
      data.attribute.inverse,
      data.position
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
  selectedNode.value = null;
  const targetElement = event.target as Element;
  if (!targetElement.closest(".node")) {
    nodes.value.forEach((node) => {
      node.selected = false;
    });
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
</script>

<template>
  <input
    type="file"
    @change="uploadFile"
    class="fileInput"
    v-if="filepath === ''"
  />
  <!--
  <h4 v-else class="fileInput" style="margin-top: 0">
    {{ filepath.split("/")[1].replace(/\..*?$/, "") }}
  </h4>
 -->

  <div class="container">
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
          :scale="scale"
          @update:position="updateNodePosition(node.id, $event)"
          @add:node="addNode(node.id, $event)"
          @select:node="selectNode(node)"
          @update:drawingEdgePosition="updateDrawingEdge($event)"
        />
      </div>
    </div>

    <!-- 属性表示欄 -->
    <div class="sidebar">
      <div v-if="selectedNode">
        <PropertyArea :node="selectedNode" />
      </div>
    </div>

    <!-- ノード追加メニュー -->
    <div class="add-menu" v-if="showSearch" @click="closeSearch">
      <SearchEntity :elements="ifcElements" @select="selectEntity" />
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  height: 100vh;
}
.fileInput {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1;
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
  width: 25vw; /* 1/4 of the screen width */
  height: 100vh; /* Full height of the container */
  z-index: 2; /* Overlay on top of the canvas */
  word-wrap: break-word; /* 長い単語でも折り返しを行う */
  overflow: auto; /* 必要に応じてスクロールバーを表示 */
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

.add-menu {
  position: absolute;
  overflow: auto;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* height: 50vh; */
  /* top: 50px; */
  /* left: 20px; */
  /* z-index: 1; */
}
</style>
