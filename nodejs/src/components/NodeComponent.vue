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
const isId = (contents: AttrContent[]): boolean => {
  return contents[0].type === "id";
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
          v-if="hasValue(attribute.contents)"
          :class="{ 'inverse-attribute': attribute.inverse }"
        >
          <span class="truncate-text" :title="attribute.name">{{
            attribute.name
          }}</span>
          <span
            class="dot"
            v-if="isId(attribute.contents)"
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
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 200px;
  background-color: #fafafacc;
  user-select: none;
}

.node-header {
  background-color: #f0f0f0;
  border-radius: 5px 5px 0px 0px;
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
  background-color: #00cc99; /* 明るめの青っぽい緑 */
  color: white;
  border-radius: 50%;
}
.icon:hover {
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.5); /* 影を追加 */
  background-color: #2dbd2d; /* 背景色を少し明るく */
}
/* node.reference が null の場合にホバー処理を無効化 */
.icon-disabled {
  pointer-events: none; /* イベントを無効化 */
  background-color: green; /* 背景色を無効状態：暗めの緑に変更 */
  box-shadow: none; /* 影を削除 */
  cursor: default; /* 通常のカーソル */
}

.node-body {
  padding: 10px;
}

.attribute {
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 24px;
  line-height: 24px;
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
  cursor: pointer;
}
.dot:hover {
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.5); /* 影を追加 */
  background-color: #ffa500; /* 背景色を少し明るく */
}
.inverse-attribute .dot {
  left: -5px;
}

.selected {
  border-color: blue; /* 選択されたノードのボーダーの色を変更 */
}
</style>
