<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

interface VirtualItem {
  data: any;
  index: number;
}

const props = defineProps({
  items: { type: Array, required: true },
  itemHeight: { type: Number, default: 50 },
  containerHeight: { type: Number, default: 500 },
  buffer: { type: Number, default: 5 },
});

const container = ref<HTMLDivElement | null>(null);
const scrollTop = ref(0);

const visibleCount = computed(
  () => Math.ceil(props.containerHeight / props.itemHeight) + props.buffer
);

const startIndex = computed(() =>
  Math.floor(scrollTop.value / props.itemHeight)
);

const endIndex = computed(() => startIndex.value + visibleCount.value);

const visibleItems = computed<VirtualItem[]>(() =>
  props.items.slice(startIndex.value, endIndex.value).map((item, i) => ({
    data: item,
    index: startIndex.value + i,
  }))
);

const totalHeight = computed(() => props.items.length * props.itemHeight);

function handleScroll() {
  if (container.value) {
    scrollTop.value = container.value.scrollTop;
  }
}

onMounted(() => {
  if (container.value) {
    container.value.style.height = `${props.containerHeight}px`;
  }
});
</script>

<template>
  <div ref="container" class="scroll-container" @scroll="handleScroll">
    <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
      <div
        v-for="item in visibleItems"
        :style="{
          position: 'absolute',
          top: `${item.index * itemHeight}px`,
          height: `${itemHeight}px`,
          left: 0,
          right: 0,
        }"
      >
        <slot :item="item.data" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.scroll-container {
  overflow-y: auto;
  border: 1px solid #ccc;

  /* min-width: 150px; */
  max-width: 500px;
}
</style>
