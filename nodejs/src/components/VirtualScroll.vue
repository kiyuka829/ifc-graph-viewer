<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { SearchItem } from "./interfaces";

const props = defineProps({
  items: { type: Array as () => SearchItem[], required: true },
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

const visibleItems = computed(() =>
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
    <div
      :style="{
        height: `${totalHeight}px`,
        minWidth: '150px',
        maxWidth: '500px',
        position: 'relative',
      }"
    >
      <!-- 幅調整用のダミー -->
      <div style="visibility: hidden">
        {{ items[0]?.displayName.replace(/ /g, "a") }}
      </div>

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
}
</style>
