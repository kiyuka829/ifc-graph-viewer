<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Node, Position } from "./interfaces";

// // Props を定義します
const props = defineProps<{
  node: Node;
}>();
const node = props.node;

// Emit the update event to the parent component with the new position
const emit = defineEmits(["update:position", "add:node"]);

const currentMouseUpHandler = ref<((event: MouseEvent) => void) | null>(null);

onMounted(() => {
  // updateEdgePositions();
});

const isDragging = ref(false);
const startPosition = ref<Position>({ x: 0, y: 0 });

const onMouseDown = (event: MouseEvent) => {
  // Start dragging and record the starting position
  isDragging.value = true;
  startPosition.value = {
    x: event.clientX - node.position.x,
    y: event.clientY - node.position.y,
  };

  // Attach the event listeners for mouse move and up
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

const onMouseMove = (event: MouseEvent) => {
  // Only drag if isDragging is true
  if (!isDragging.value) return;

  // Update the position of the node
  const newX = event.clientX - startPosition.value.x;
  const newY = event.clientY - startPosition.value.y;
  emit("update:position", { x: newX, y: newY });

  // console.log(newX, newY)
  // updateEdgePositions()
};

const onMouseUp = () => {
  // Stop dragging
  isDragging.value = false;

  // Remove the event listeners
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
};

const isDotDragging = ref(false);
const lastMousePosition = ref({ x: 0, y: 0 });

const onDotMouseDown = (event: MouseEvent, attribute) => {
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

  // dot 専用のイベントリスナーを設定
  currentMouseUpHandler.value = () => onDotMouseUp(attribute);
  document.addEventListener("mousemove", onDotMouseMove);
  document.addEventListener("mouseup", currentMouseUpHandler.value);
};

const onDotMouseMove = (event: MouseEvent) => {
  if (!isDotDragging.value) return;
  lastMousePosition.value = { x: event.clientX, y: event.clientY };
};

const onDotMouseUp = (attribute) => {
  // dot のドラッグを終了
  isDotDragging.value = false;

  // イベントリスナーを削除
  if (currentMouseUpHandler.value) {
    document.removeEventListener("mousemove", onDotMouseMove);
    document.removeEventListener("mouseup", currentMouseUpHandler.value);
    currentMouseUpHandler.value = null; // ハンドラの参照をクリア
  }

  emit("add:node", {
    position: lastMousePosition.value,
    attribute: attribute,
  });
};

function stringifyValue(value: string | string[]) {
  if (Array.isArray(value)) {
    // 配列の場合、カンマ区切りの文字列に変換します
    return `${value.map((v) => `#${v.value}`).join(", ")}`;
  } else if (typeof value === "number") {
    // 数値はID
    return `#${value}`;
  } else {
    // 配列でない場合、そのまま文字列に変換します
    return value;
  }
}

// attributeに値があるかどうか
const hasValue = (value: string | string[]): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  } else {
    return value !== null && value !== undefined && value !== "";
  }
};

// id判定
const isId = (value: string | string[]): boolean => {
  return typeof value === "number" || Array.isArray(value);
};
</script>

<template>
  <div
    class="node"
    :style="{
      position: 'absolute',
      top: node.position.y + 'px',
      left: node.position.x + 'px',
    }"
    @mousedown="onMouseDown"
  >
    <div class="node-header">
      <span class="id">#{{ node.id }}</span>
      <span class="title">{{ node.type }}</span>
      <span class="icon"></span>
    </div>
    <div class="node-body">
      <template v-for="(attribute, _) in node.attributes" :key="attribute.name">
        <div
          class="attribute"
          v-if="hasValue(attribute.content)"
          :class="{ 'inverse-attribute': attribute.inverse }"
        >
          <span>{{ attribute.name }}</span>
          <!-- <span>{{ stringifyValue(attribute.content) }}</span> -->
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
  /* width: 200px; */
  min-width: 200px;
  font-family: Arial, sans-serif;
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
</style>
