<script setup lang="ts">
import AlignCenterIcon from "../assets/icons/align-center.svg";
import AlignMiddleIcon from "../assets/icons/align-middle.svg";
import AlignLeftIcon from "../assets/icons/align-left.svg";
import AlignRightIcon from "../assets/icons/align-right.svg";
import AlignTopIcon from "../assets/icons/align-top.svg";
import AlignBottomIcon from "../assets/icons/align-bottom.svg";
import AlignHorizontalIcon from "../assets/icons/align-horizontal.svg";
import AlignVerticalIcon from "../assets/icons/align-vertical.svg";

const emit = defineEmits(["align:node"]);

// ノードを整列する
const alignNodes = (event: MouseEvent, align: string) => {
  event.stopPropagation();
  emit("align:node", align);
};
</script>

<template>
  <div class="align-icons">
    <span title="左揃え">
      <AlignLeftIcon
        title="Align Left"
        class="align-icon"
        height="1rem"
        @click="alignNodes($event, 'left')"
        @mousedown.stop
      />
    </span>
    <span title="左右中央揃え">
      <AlignCenterIcon
        class="align-icon"
        height="1rem"
        @click="alignNodes($event, 'center')"
        @mousedown.stop
      />
    </span>
    <span title="右揃え">
      <AlignRightIcon
        class="align-icon"
        height="1rem"
        @click="alignNodes($event, 'right')"
        @mousedown.stop
      />
    </span>
    <span title="上揃え">
      <AlignTopIcon
        class="align-icon"
        height="1rem"
        @click="alignNodes($event, 'top')"
        @mousedown.stop
      />
    </span>
    <span title="上下中央揃え">
      <AlignMiddleIcon
        class="align-icon"
        height="1rem"
        @click="alignNodes($event, 'middle')"
        @mousedown.stop
      />
    </span>
    <span title="下揃え">
      <AlignBottomIcon
        class="align-icon"
        height="1rem"
        @click="alignNodes($event, 'bottom')"
        @mousedown.stop
      />
    </span>
    <span title="水平方向に整列">
      <AlignHorizontalIcon
        class="align-icon"
        height="1rem"
        @click="alignNodes($event, 'horizontal')"
        @mousedown.stop
      />
    </span>
    <span title="垂直方向に整列">
      <AlignVerticalIcon
        class="align-icon"
        height="1rem"
        @click="alignNodes($event, 'vertical')"
        @mousedown.stop
      />
    </span>
  </div>
</template>

<style scoped>
.align-icons {
  position: absolute;
  top: 54px; /* 44px header + 10px offset */
  right: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 6px 4px;
  box-shadow: var(--shadow-md);
}

.align-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background-color 0.15s, color 0.15s;
}

.align-icon:hover {
  background-color: var(--accent-subtle);
  color: var(--accent);
}

/* SVG icons inherit color */
.align-icon :deep(svg path),
.align-icon :deep(svg rect),
.align-icon :deep(svg line),
.align-icon :deep(svg polygon) {
  fill: currentColor;
  stroke: currentColor;
}
</style>
