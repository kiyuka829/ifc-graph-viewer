<script setup lang="ts">
// import { Edge } from './interfaces';

const props = defineProps<{
  // edge: Edge,
  from: { x: number; y: number };
  to: { x: number; y: number };
}>();
// const edge = props.edge
props;
</script>

<template>
  <line :x1="from.x" :y1="from.y" :x2="to.x" :y2="to.y" stroke="black" />
</template>
