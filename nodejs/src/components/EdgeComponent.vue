<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  dashed?: boolean;
}>();

const strokeDashArray = computed(() => (props.dashed ? "5, 5" : "none"));
</script>

<template>
  <line
    :x1="from.x"
    :y1="from.y"
    :x2="to.x"
    :y2="to.y"
    :stroke-dasharray="strokeDashArray"
    stroke="black"
  />
</template>
