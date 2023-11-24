<script setup lang="ts">
const props = defineProps<{
  from: { x: number; y: number };
  to: { x: number; y: number };
}>();
props;
</script>

<template>
  <line :x1="from.x" :y1="from.y" :x2="to.x" :y2="to.y" stroke="black" />
</template>
