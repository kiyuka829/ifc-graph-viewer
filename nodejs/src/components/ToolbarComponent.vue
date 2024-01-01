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
