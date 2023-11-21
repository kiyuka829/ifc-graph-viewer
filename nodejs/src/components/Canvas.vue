<script setup lang="ts">
import { ref, computed } from "vue";
import { onMounted, onUnmounted } from "vue";
import axios from "axios";
import NodeComponent from "./NodeComponent.vue";
import EdgeComponent from "./EdgeComponent.vue";

import { Node, Edge, Position, Attribute } from "./interfaces";

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

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});

// ドラッグ中の位置を追跡するための状態
const position = ref({ x: 0, y: 0 });
const dragging = ref(false);
let start = { x: 0, y: 0 };

function startDrag(event: MouseEvent) {
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

// 選択したファイルを保持する変数
const filepath = ref<string>("");

const uploadFile = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    const selectedFile = input.files[0];

    // FormData オブジェクトを作成してファイルを追加
    const formData = new FormData();
    formData.append("file", selectedFile);

    // ファイルをサーバーにアップロード
    axios
      .post("http://localhost:5000/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => {
        // レスポンスを処理
        console.log(response.data.model);
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

// attributeに値があるかどうか
const hasValue = (value: string | string[]): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  } else {
    return value !== null && value !== undefined && value !== "";
  }
};

// レスポンスデータをNodeに変換
function convertToNode(data: any): Node {
  const node: Node = {
    id: data.id,
    type: data.type,
    attributes: [],
    position: { x: 0, y: 0 },
    selected: false,
  };

  // attributes
  let count = 0;
  for (const attr of data.attributes) {
    const attribute = {
      name: attr.name,
      content: attr.value,
      edgePosition: { x: attr.inverse ? 0 : 200, y: 68 + count * 29 },
      inverse: attr.inverse,
      visible: true,
    };
    hasValue(attr.value) && count++;
    node.attributes.push(attribute);
  }

  return node;
}

const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);

// const edges = ref<Edge[]>([
//   {
//     id: "edge1",
//     from: { nodeId: "node1", attrName: "attr1" },
//     to: { nodeId: "node2", attrName: "attr3" },
//   },
// ]);

const updateNodePosition = (
  nodeId: string,
  newPosition: { x: number; y: number }
) => {
  const node = nodes.value.find((c) => c.id === nodeId);
  if (node) {
    node.position = newPosition;
  }
};

const edgePosition = computed(() => {
  return edges.value.map((edge) => {
    const from = edge.from;
    const from_node = nodes.value.find((c) => c.id === from.nodeId);
    const from_attr = from_node?.attributes.find(
      (c) => c.name === from.attrName
    );
    const from_edge = {
      x: (from_node?.position.x ?? 0) + (from_attr?.edgePosition?.x ?? 0),
      y: (from_node?.position.y ?? 0) + (from_attr?.edgePosition?.y ?? 0),
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

const addNode_ = (
  srcId: string,
  dstId: string,
  srcName: string,
  inverse: boolean,
  dstPosition: Position
) => {
  const config = {
    method: "post",
    url: "http://localhost:5000/get_node",
    data: {
      path: filepath.value,
      id: dstId,
    },
  };
  axios(config)
    .then((response) => {
      // レスポンスを処理
      console.log(response.data);
      const node = convertToNode(response.data.node);

      // 表示済みならノードを追加しない
      if (!nodes.value.find((c) => c.id === dstId)) {
        node.position = dstPosition;
        nodes.value.push(node);
      }

      // nodeIdと一致するattributeのnameを取得
      const targetAttr = node.attributes.find((attr) => {
        if (Array.isArray(attr.content)) {
          if (attr.content.find((c) => c.value === srcId)) {
            return true;
          }
        } else if (typeof attr.content === "number") {
          return attr.content === srcId;
        } else {
          return false;
        }
      });

      // エッジ作成
      const from: { nodeId: string; attrName: string } = {
        nodeId: "",
        attrName: "",
      };
      const to: { nodeId: string; attrName: string } = {
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

      edges.value.push({
        id: "edge1",
        from: from,
        to: to,
      });
    })
    .catch((error) => {
      console.log(error);
    });
};

const addNode = (
  nodeId: string,
  data: { position: Position; attribute: Attribute }
) => {
  const id = data.attribute.content;
  const ids = Array.isArray(id) ? id : [{ value: id }];
  ids.forEach((id) => {
    addNode_(
      nodeId,
      id.value,
      data.attribute.name,
      data.attribute.inverse,
      data.position
    );
  });
};

const scale = ref(1);

const handleWheel = (event: WheelEvent) => {
  event.preventDefault();
  const zoomIntensity = 0.1;
  const wheelDelta = event.deltaY;
  // Zoom in or out
  scale.value += wheelDelta > 0 ? -zoomIntensity : zoomIntensity;
  // Prevent scale from becoming too small or too large
  scale.value = Math.min(Math.max(0.1, scale.value), 2);
};

const clearSelect = (event: MouseEvent) => {
  const targetElement = event.target as Element;
  if (!targetElement.closest(".node")) {
    nodes.value.forEach((node) => {
      node.selected = false;
    });
  }
};
</script>

<template>
  <input type="file" @change="uploadFile" class="fileInput" />
  <div
    class="canvas"
    @mousedown="startDrag"
    @mousemove="drag"
    @mouseup="endDrag"
    @mouseleave="endDrag"
    @wheel="handleWheel"
  >
    <svg class="edge-container" xmlns="http://www.w3.org/2000/svg">
      <g
        :style="{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: 'center',
        }"
      >
        <EdgeComponent
          v-for="edge in edgePosition"
          :key="edge.id"
          :from="edge.from"
          :to="edge.to"
        />
      </g>
    </svg>

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
      />
    </div>
  </div>
</template>

<style scoped>
.fileInput {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1;
}
.canvas {
  width: 100vw;
  height: 100vh;
  overflow: auto;
  position: relative;
}

.node-container {
  transform-origin: center;
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
</style>
