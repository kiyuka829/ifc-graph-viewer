<script setup lang="ts">
import { ref, onMounted } from "vue";
import { AttrContent, Attribute, IfcNode, Position } from "./interfaces";
import { hasValue } from "./utils";

const props = defineProps<{
  node: IfcNode;
  selected: boolean;
  scale: number;
}>();
const node = props.node;
const emit = defineEmits([
  "update:position",
  "add:node",
  "select:node",
  "update:drawingEdgePosition",
]);

// ドラッグ制御用
const isDragging = ref(false);
const startEdgePosition = ref<Position>({ x: 0, y: 0 });
const startMousePosition = ref<Position>({ x: 0, y: 0 });

const isDotDragging = ref(false);
const lastMousePosition = ref({ x: 0, y: 0 });

// ノード追加時のイベントリスナー
const currentMouseUpHandler = ref<((event: MouseEvent) => void) | null>(null);
const currentMouseMoveHandler = ref<((event: MouseEvent) => void) | null>(null);

onMounted(() => {
  // updateEdgePositions();
});

// ノードの移動
const onMouseDown = (event: MouseEvent) => {
  if (event.button === 2) {
    // 右クリックは処理しない
    return;
  }
  if (event.shiftKey) {
    // Shiftキー押下時は選択トグル処理で、移動はしない
    emit("select:node", true);
    return;
  }
  event.stopPropagation();

  // ノードを選択
  emit("select:node");

  // Start dragging and record the starting position
  isDragging.value = true;
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
  const dx = (event.clientX - startMousePosition.value.x) / props.scale;
  const dy = (event.clientY - startMousePosition.value.y) / props.scale;
  emit("update:position", { x: dx, y: dy });
};

const onMouseUp = () => {
  // Stop dragging
  isDragging.value = false;

  // Remove the event listeners
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
};

// エッジドラッグ時のノード追加処理
const onDotMouseDown = (event: MouseEvent, attribute: Attribute | null) => {
  if (!attribute) return;
  if (event.button === 2) {
    // 右クリックは処理しない
    return;
  }
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

  startEdgePosition.value.x = attribute.edgePosition.x + node.position.x;
  startEdgePosition.value.y = attribute.edgePosition.y + node.position.y;
  startMousePosition.value = { x: event.clientX, y: event.clientY };
  lastMousePosition.value = { ...startMousePosition.value };

  // 描画中のエッジの位置を初期化
  const edge = {
    from: {
      x: startEdgePosition.value.x,
      y: startEdgePosition.value.y,
    },
    to: {
      x: startEdgePosition.value.x,
      y: startEdgePosition.value.y,
    },
  };
  emit("update:drawingEdgePosition", edge);

  // dot 専用のイベントリスナーを設定
  currentMouseMoveHandler.value = (event: MouseEvent) =>
    onDotMouseMove(event, attribute);
  currentMouseUpHandler.value = () => onDotMouseUp(attribute);
  document.addEventListener("mousemove", currentMouseMoveHandler.value);
  document.addEventListener("mouseup", currentMouseUpHandler.value);
};

// ドラッグ中のエッジの終点位置を計算
function calculateMovedPosition(): Position {
  return {
    x:
      startEdgePosition.value.x +
      (lastMousePosition.value.x - startMousePosition.value.x) / props.scale,
    y:
      startEdgePosition.value.y +
      (lastMousePosition.value.y - startMousePosition.value.y) / props.scale,
  };
}

const onDotMouseMove = (event: MouseEvent, attribute: Attribute) => {
  if (!isDotDragging.value) return;
  lastMousePosition.value = { x: event.clientX, y: event.clientY };

  // 描画中のエッジの位置を更新
  let posStart = {
    x: startEdgePosition.value.x,
    y: startEdgePosition.value.y,
  };
  let posEnd = calculateMovedPosition();

  if (attribute.inverse) {
    // 逆属性の場合、from と to を入れ替える
    [posStart, posEnd] = [posEnd, posStart];
  }
  const edge = {
    from: posStart,
    to: posEnd,
  };

  emit("update:drawingEdgePosition", edge);
};

const onDotMouseUp = (attribute: Attribute) => {
  // dot のドラッグを終了
  isDotDragging.value = false;

  // イベントリスナーを削除
  if (currentMouseUpHandler.value && currentMouseMoveHandler.value) {
    document.removeEventListener("mousemove", currentMouseMoveHandler.value);
    document.removeEventListener("mouseup", currentMouseUpHandler.value);
    currentMouseMoveHandler.value = null; // ハンドラの参照をクリア
    currentMouseUpHandler.value = null; // ハンドラの参照をクリア
  }

  const position = calculateMovedPosition();

  emit("add:node", {
    position: position,
    attribute: attribute,
  });
};

// id判定
const isId = (content: AttrContent): boolean => {
  return content.type === "id";
};
</script>

<template>
  <div
    class="node"
    :class="{ selected: selected }"
    :style="{
      position: 'absolute',
      top: node.position.y + 'px',
      left: node.position.x + 'px',
    }"
    @mousedown="onMouseDown"
  >
    <div class="node-header">
      <!-- TODO: ID表記処理がごり押しなので注意 -->
      <span class="id">{{
        typeof node.id === "number" ? "#" + node.id : ""
      }}</span>
      <span class="title truncate-text" :title="node.type">{{
        node.type
      }}</span>
      <span
        :class="['icon', { 'icon-disabled': !node.reference }]"
        @mousedown.prevent="(event) => onDotMouseDown(event, node.reference)"
      ></span>
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
          <span
            class="dot"
            v-if="isId(attribute.content)"
            @mousedown.prevent="(event) => onDotMouseDown(event, attribute)"
          ></span>
        </div>
      </template>
    </div>
  </div>
  <!--  -->
</template>

<style scoped>
.node {
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  width: 200px;
  background-color: var(--node-bg);
  user-select: none;
  box-shadow: var(--shadow-md);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.node:hover {
  box-shadow: var(--shadow-lg);
}

.node-header {
  background-color: var(--node-header-bg);
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid var(--border-color);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.id {
  font-weight: 700;
  font-size: 0.7rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

.title {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
}

.truncate-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Reference connection dot (left side, cyan/sky) */
.icon {
  position: absolute;
  left: -6px;
  height: 12px;
  width: 12px;
  background-color: var(--success);
  border: 2px solid var(--bg-surface);
  border-radius: 50%;
  cursor: pointer;
  transition:
    background-color 0.15s,
    box-shadow 0.15s;
}

.icon:hover {
  background-color: var(--success-hover);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.icon-disabled {
  pointer-events: none;
  background-color: var(--border-color-strong);
  box-shadow: none;
  cursor: default;
}

/* Node body */
.node-body {
  padding: 8px 10px;
}

.attribute {
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 24px;
  line-height: 24px;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.inverse-attribute {
  flex-direction: row-reverse;
  justify-content: flex-end;
}

/* Attribute connection dot (right side, warning/orange) */
.dot {
  position: absolute;
  right: -6px;
  height: 12px;
  width: 12px;
  background-color: var(--warning);
  border: 2px solid var(--bg-surface);
  border-radius: 50%;
  display: inline-block;
  cursor: pointer;
  transition:
    background-color 0.15s,
    box-shadow 0.15s;
}

.dot:hover {
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.inverse-attribute .dot {
  left: -6px;
  right: auto;
}

/* Selected state */
.selected {
  border-color: var(--node-selected-border);
  box-shadow:
    0 0 0 2px var(--accent-subtle),
    var(--shadow-lg);
}
</style>
