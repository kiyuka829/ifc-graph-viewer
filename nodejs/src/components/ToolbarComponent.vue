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
    <span title="Align left">
      <AlignLeftIcon
        title="Align Left"
        class="align-icon"
        height="0.7rem"
        @click="alignNodes($event, 'left')"
        @mousedown.stop
      />
    </span>
    <span title="Align horizontal center">
      <AlignCenterIcon
        class="align-icon"
        height="0.7rem"
        @click="alignNodes($event, 'center')"
        @mousedown.stop
      />
    </span>
    <span title="Align right">
      <AlignRightIcon
        class="align-icon"
        height="0.7rem"
        @click="alignNodes($event, 'right')"
        @mousedown.stop
      />
    </span>
    <span title="Align top">
      <AlignTopIcon
        class="align-icon"
        height="0.7rem"
        @click="alignNodes($event, 'top')"
        @mousedown.stop
      />
    </span>
    <span title="Align vertical center">
      <AlignMiddleIcon
        class="align-icon"
        height="0.7rem"
        @click="alignNodes($event, 'middle')"
        @mousedown.stop
      />
    </span>
    <span title="Align bottom">
      <AlignBottomIcon
        class="align-icon"
        height="0.7rem"
        @click="alignNodes($event, 'bottom')"
        @mousedown.stop
      />
    </span>
    <span title="Distribute horizontally">
      <AlignHorizontalIcon
        class="align-icon"
        height="0.7rem"
        @click="alignNodes($event, 'horizontal')"
        @mousedown.stop
      />
    </span>
    <span title="Distribute vertically">
      <AlignVerticalIcon
        class="align-icon"
        height="0.7rem"
        @click="alignNodes($event, 'vertical')"
        @mousedown.stop
      />
    </span>
  </div>
</template>

<style scoped>
.align-icons {
  position: absolute;
  top: 48px; /* 44px header + 4px offset */
  right: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 2px;
  box-shadow: var(--shadow-md);
}

.align-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin: 1px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background-color 0.15s, color 0.15s;
}

.align-icon:hover {
  background-color: var(--accent-subtle);
  color: var(--accent);
}

/* SVG icons inherit color – target shape elements directly (not nested svg) */
.align-icon :deep(path),
.align-icon :deep(rect),
.align-icon :deep(line),
.align-icon :deep(polygon),
.align-icon :deep(circle),
.align-icon :deep(ellipse) {
  fill: currentColor;
  stroke: currentColor;
}

.align-icon :deep(svg) {
  fill: currentColor;
  stroke: currentColor;
}
</style>
