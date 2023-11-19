<script setup lang="ts">
// import { ref } from "vue";
import { ref, onMounted } from "vue";
import { Node, Position } from "./interfaces";

// Props を定義します
const props = defineProps<{
  node: Node;
}>();
const node = props.node;

// Emit the update event to the parent component with the new position
const emit = defineEmits(["update:position"]);

// const nodeElement = ref(null);
// const dotRefs = ref([]);

// const addDotRef = el => {
//   if (el) {
//     dotRefs.value.push(el);
//   }
// };

onMounted(() => {
  // updateEdgePositions();
});

// const getDotPosition = (dot) => {
//   const nodeRect = nodeElement.value.getBoundingClientRect();
//   const dotRect = dot.getBoundingClientRect();
//   return {
//     x: dotRect.left - nodeRect.left + dotRect.width / 2,
//     y: dotRect.top - nodeRect.top + dotRect.height / 2
//   };
// };

// // ノードや属性が更新された際にエッジの位置を再計算
// const updateEdgePositions = () => {
//   const dots = nodeElement.value.querySelectorAll('.dot');
//   dots.forEach((dot, index) => {
//     const position = getDotPosition(dot);
//     console.log(position)
//     // node.attributes[index].edgePosition = position
//     // ここでエッジの位置を更新する
//     // 例: updateEdgePosition(node.attributes[index].id, position);
//   });
// };

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

// const isRefAttribute = (attribute: string): boolean => {
//   return false;
// };

function stringifyValue(value: string | string[]) {
  if (Array.isArray(value)) {
    // 配列の場合、カンマ区切りの文字列に変換します
    return `(${value.map((v) => v.value).join(", ")})`;
  } else {
    // 配列でない場合、そのまま文字列に変換します
    return value;
  }
}
</script>

<template>
  <!-- ref="nodeElement" -->
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
      <span class="id">{{ node.id }}</span>
      <span class="title">{{ node.type }}</span>
      <span class="icon"></span>
    </div>
    <div class="node-body">
      <div
        class="attribute"
        v-for="(attribute, index) in node.attributes"
        :key="index"
      >
        <span>{{ attribute.name }}</span>
        <!-- <span>{{ stringifyValue(attribute.content) }}</span> -->
        <!-- <span class="dot" v-if="!isRefAttribute(attribute)"></span> -->
        <span class="dot"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.node {
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 200px;
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
  background-color: green;
  color: white;
  padding: 3px;
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

.dot {
  height: 10px;
  width: 10px;
  background-color: orange;
  border-radius: 50%;
  display: inline-block;
}

.attribute.ref {
  font-style: italic;
}
</style>
