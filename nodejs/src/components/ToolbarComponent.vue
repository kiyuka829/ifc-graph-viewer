<script setup lang="ts">
import { IfcNode } from "./interfaces";
import AlignCenterIcon from "../assets/icons/align-center.svg";
import AlignMiddleIcon from "../assets/icons/align-middle.svg";
import AlignLeftIcon from "../assets/icons/align-left.svg";
import AlignRightIcon from "../assets/icons/align-right.svg";
import AlignTopIcon from "../assets/icons/align-top.svg";
import AlignBottomIcon from "../assets/icons/align-bottom.svg";
import AlignHorizontalIcon from "../assets/icons/align-horizontal.svg";
import AlignVerticalIcon from "../assets/icons/align-vertical.svg";

const props = defineProps<{
  nodes: IfcNode[];
  selectedNodeIds: number[];
}>();
const nodes = props.nodes;
const selectedNodeIds = props.selectedNodeIds;

// ノードを整列する
const alignLeft = (event: MouseEvent) => {
  event.stopPropagation();
  const selectedNodes = nodes.filter((node) =>
    selectedNodeIds.includes(node.id)
  );
  const minX = Math.min(...selectedNodes.map((node) => node.position.x));
  selectedNodes.forEach((node) => {
    node.position.x = minX;
  });
};
const alignCenter = (event: MouseEvent) => {
  event.stopPropagation();
  const selectedNodes = nodes.filter((node) =>
    selectedNodeIds.includes(node.id)
  );
  const minX = Math.min(...selectedNodes.map((node) => node.position.x));
  const maxX = Math.max(...selectedNodes.map((node) => node.position.x));
  selectedNodes.forEach((node) => {
    node.position.x = minX + (maxX - minX) / 2;
  });
};
const alignRight = (event: MouseEvent) => {
  event.stopPropagation();
  const selectedNodes = nodes.filter((node) =>
    selectedNodeIds.includes(node.id)
  );
  const maxX = Math.max(...selectedNodes.map((node) => node.position.x));
  selectedNodes.forEach((node) => {
    node.position.x = maxX;
  });
};
const alignTop = (event: MouseEvent) => {
  event.stopPropagation();
  const selectedNodes = nodes.filter((node) =>
    selectedNodeIds.includes(node.id)
  );
  const minY = Math.min(...selectedNodes.map((node) => node.position.y));
  selectedNodes.forEach((node) => {
    node.position.y = minY;
  });
};
const alignMiddle = (event: MouseEvent) => {
  event.stopPropagation();
  const selectedNodes = nodes.filter((node) =>
    selectedNodeIds.includes(node.id)
  );
  const minY = Math.min(...selectedNodes.map((node) => node.position.y));
  const maxY = Math.max(...selectedNodes.map((node) => node.position.y));
  selectedNodes.forEach((node) => {
    node.position.y = minY + (maxY - minY) / 2;
  });
};
const alignBottom = (event: MouseEvent) => {
  event.stopPropagation();
  const selectedNodes = nodes.filter((node) =>
    selectedNodeIds.includes(node.id)
  );
  const maxY = Math.max(...selectedNodes.map((node) => node.position.y));
  selectedNodes.forEach((node) => {
    node.position.y = maxY;
  });
};
const alignHorizontally = (event: MouseEvent) => {
  event.stopPropagation();
  const selectedNodes = nodes
    .filter((node) => selectedNodeIds.includes(node.id))
    .sort((a, b) => a.position.x - b.position.x);

  // 水平方向に等間隔に整列する
  const minX = Math.min(...selectedNodes.map((node) => node.position.x));
  const maxX = Math.max(...selectedNodes.map((node) => node.position.x));
  const interval = (maxX - minX) / (selectedNodes.length - 1);
  selectedNodes.forEach((node, idx) => {
    node.position.x = minX + interval * idx;
  });
};
const alignVertically = (event: MouseEvent) => {
  event.stopPropagation();
  const selectedNodes = nodes
    .filter((node) => selectedNodeIds.includes(node.id))
    .sort((a, b) => a.position.y - b.position.y);

  // 垂直方向に等間隔に整列する
  const minY = Math.min(...selectedNodes.map((node) => node.position.y));
  const maxY = Math.max(...selectedNodes.map((node) => node.position.y));
  const interval = (maxY - minY) / (selectedNodes.length - 1);
  selectedNodes.forEach((node, idx) => {
    node.position.y = minY + interval * idx;
  });
};
</script>

<template>
  <div class="align-icons">
    <span title="左揃え">
      <AlignLeftIcon
        title="Align Left"
        class="align-icon"
        height="1rem"
        @click="alignLeft"
        @mousedown.stop
      />
    </span>
    <span title="左右中央揃え">
      <AlignCenterIcon
        class="align-icon"
        height="1rem"
        @click="alignCenter"
        @mousedown.stop
      />
    </span>
    <span title="右揃え">
      <AlignRightIcon
        class="align-icon"
        height="1rem"
        @click="alignRight"
        @mousedown.stop
      />
    </span>
    <span title="上揃え">
      <AlignTopIcon
        class="align-icon"
        height="1rem"
        @click="alignTop"
        @mousedown.stop
      />
    </span>
    <span title="上下中央揃え">
      <AlignMiddleIcon
        class="align-icon"
        height="1rem"
        @click="alignMiddle"
        @mousedown.stop
      />
    </span>
    <span title="下揃え">
      <AlignBottomIcon
        class="align-icon"
        height="1rem"
        @click="alignBottom"
        @mousedown.stop
      />
    </span>
    <span title="水平方向に整列">
      <AlignHorizontalIcon
        class="align-icon"
        height="1rem"
        @click="alignHorizontally"
        @mousedown.stop
      />
    </span>
    <span title="垂直方向に整列">
      <AlignVerticalIcon
        class="align-icon"
        height="1rem"
        @click="alignVertically"
        @mousedown.stop
      />
    </span>
  </div>
</template>

<style scoped>
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
</style>
