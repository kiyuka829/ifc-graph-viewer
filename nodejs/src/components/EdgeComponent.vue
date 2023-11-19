<script setup lang="ts">
// import { Edge } from './interfaces';

const props = defineProps<{
  // edge: Edge,
  from: { x: number, y: number };
  to: { x: number, y: number };
}>();
// const edge = props.edge
props

</script>

<template>
  <svg
    :style="{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line
      :x1="from.x"
      :y1="from.y"
      :x2="to.x"
      :y2="to.y"
      stroke="black"
    />
  </svg>
</template>
