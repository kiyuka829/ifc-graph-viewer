<script setup lang="ts">
import { ref, onMounted } from "vue";
import { AttrContent, Attribute, Node, Position } from "./interfaces";
import { hasValue } from "./utils";

const props = defineProps<{
  node: Node;
  scale: number;
}>();
const node = props.node;
const emit = defineEmits(["update:position", "add:node", "select:node"]);

// ドラッグ制御用
const isDragging = ref(false);
const startNodePosition = ref<Position>({ x: 0, y: 0 });
const startEdgePosition = ref<Position>({ x: 0, y: 0 });
const startMousePosition = ref<Position>({ x: 0, y: 0 });

const isDotDragging = ref(false);
const lastMousePosition = ref({ x: 0, y: 0 });

const currentMouseUpHandler = ref<((event: MouseEvent) => void) | null>(null);

onMounted(() => {
  // updateEdgePositions();
});

// ノードの移動
const onMouseDown = (event: MouseEvent) => {
  event.stopPropagation();

  // ノードを選択
  node.selected = true;
  emit("select:node");

  // Start dragging and record the starting position
  isDragging.value = true;
  startNodePosition.value = {
    x: node.position.x,
    y: node.position.y,
  };
  startMousePosition.value = {
    x: event.clientX,
    y: event.clientY,
  };

  // Attach the event listeners for mouse move and up
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

const onMouseMove = (event: MouseEvent) => {
  // Only drag if isDragging is true
  if (!isDragging.value) return;

  // Update the position of the node
  const newX =
    startNodePosition.value.x +
    (event.clientX - startMousePosition.value.x) / props.scale;
  const newY =
    startNodePosition.value.y +
    (event.clientY - startMousePosition.value.y) / props.scale;
  emit("update:position", { x: newX, y: newY });
};

const onMouseUp = () => {
  // Stop dragging
  isDragging.value = false;

  // Remove the event listeners
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
};

// エッジドラッグ時のノード追加処理
const onDotMouseDown = (event: MouseEvent, attribute: Attribute) => {
  event.stopPropagation();

  // 座標表示用
  // const dotElement = event.target;
  // const nodeElement = event.currentTarget.closest(".node");

  // // dotElementとnodeElementの位置情報を取得
  // const dotRect = dotElement.getBoundingClientRect();
  // const nodeRect = nodeElement.getBoundingClientRect();

  // // dotの中心位置を計算（ビューポートに対する相対位置）
  // const dotCenterX = dotRect.left + dotRect.width / 2;
  // const dotCenterY = dotRect.top + dotRect.height / 2;

  // // nodeからの相対位置を計算
  // const relativeCenterX = dotCenterX - nodeRect.left;
  // const relativeCenterY = dotCenterY - nodeRect.top;

  // console.log("Dot center relative to node:", relativeCenterX, relativeCenterY);

  // dot のドラッグを開始
  isDotDragging.value = true;

  startEdgePosition.value.x =
    (attribute.edgePosition?.x ?? event.clientX) + node.position.x;
  startEdgePosition.value.y =
    (attribute.edgePosition?.y ?? event.clientY) + node.position.y;
  startMousePosition.value = { x: event.clientX, y: event.clientY };
  lastMousePosition.value = { ...startMousePosition.value };

  // dot 専用のイベントリスナーを設定
  currentMouseUpHandler.value = () => onDotMouseUp(attribute);
  document.addEventListener("mousemove", onDotMouseMove);
  document.addEventListener("mouseup", currentMouseUpHandler.value);
};

const onDotMouseMove = (event: MouseEvent) => {
  if (!isDotDragging.value) return;
  lastMousePosition.value = { x: event.clientX, y: event.clientY };
};

const onDotMouseUp = (attribute: Attribute) => {
  // dot のドラッグを終了
  isDotDragging.value = false;

  // イベントリスナーを削除
  if (currentMouseUpHandler.value) {
    document.removeEventListener("mousemove", onDotMouseMove);
    document.removeEventListener("mouseup", currentMouseUpHandler.value);
    currentMouseUpHandler.value = null; // ハンドラの参照をクリア
  }

  const position = {
    x:
      startEdgePosition.value.x +
      (lastMousePosition.value.x - startMousePosition.value.x) / props.scale,
    y:
      startEdgePosition.value.y +
      (lastMousePosition.value.y - startMousePosition.value.y) / props.scale,
  };

  emit("add:node", {
    position: position,
    attribute: attribute,
  });
};

function stringifyValue(content: AttrContent | AttrContent[]) {
  if (Array.isArray(content)) {
    // 配列の場合、カンマ区切りの文字列に変換します
    return `${content.map((v) => `#${v.value}`).join(", ")}`;
  } else if (content.type === "id") {
    // 数値はID
    return `#${content.value}`;
  } else {
    // 配列でない場合、そのまま文字列に変換します
    return content.value.toString();
  }
}

// id判定
const isId = (content: AttrContent | AttrContent[]): boolean => {
  if (Array.isArray(content)) {
    return content[0].type === "id";
  } else {
    return content.type === "id";
  }
};
</script>

<template>
  <div
    class="node"
    :class="{ selected: node.selected }"
    :style="{
      position: 'absolute',
      top: node.position.y + 'px',
      left: node.position.x + 'px',
    }"
    @mousedown="onMouseDown"
  >
    <div class="node-header">
      <span class="id">#{{ node.id }}</span>
      <span class="title truncate-text" :title="node.type">{{
        node.type
      }}</span>
      <span class="icon"></span>
    </div>
    <div class="node-body">
      <template v-for="(attribute, _) in node.attributes" :key="attribute.name">
        <div
          class="attribute"
          v-if="hasValue(attribute.content)"
          :class="{ 'inverse-attribute': attribute.inverse }"
        >
          <span class="truncate-text" :title="attribute.name">{{
            attribute.name
          }}</span>
          <!--
          <span
            class="truncate-text"
            :title="stringifyValue(attribute.content)"
            >{{ stringifyValue(attribute.content) }}</span
          >
           -->
          <span
            class="dot"
            v-if="isId(attribute.content)"
            @mousedown.prevent="(event) => onDotMouseDown(event, attribute)"
          ></span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.node {
  position: relative;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 200px;
  font-family: Arial, sans-serif;
  background-color: #fafafacc;
  user-select: none;
}

.node-header {
  background-color: #f0f0f0;
  border-bottom: 1px solid #ccc;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.id {
  font-weight: bold;
}

.truncate-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon {
  position: absolute;
  left: -5px;
  height: 10px;
  width: 10px;
  background-color: green;
  color: white;
  border-radius: 50%;
}

.node-body {
  padding: 10px;
}

.attribute {
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.inverse-attribute {
  flex-direction: row-reverse;
  justify-content: flex-end;
}

.dot {
  position: absolute;
  right: -5px;
  height: 10px;
  width: 10px;
  background-color: orange;
  border-radius: 50%;
  display: inline-block;
}
.inverse-attribute .dot {
  left: -5px;
}

.selected {
  border-color: blue; /* 選択されたノードのボーダーの色を変更 */
}
</style>
