<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  label?: string;
  dashed?: boolean;
}>();

const pathD = computed(() => {
  const { x: x1, y: y1 } = props.from;
  const { x: x2, y: y2 } = props.to;
  // 制御点までの距離
  const controlDistance = Math.min(100, Math.max(Math.abs(y1 - y2), Math.abs(x1 - x2)));
  const control1X = x1 + controlDistance;
  const control2X = x2 - controlDistance;
  return `M ${x1} ${y1} C ${control1X} ${y1}, ${control2X} ${y2}, ${x2} ${y2}`;
});

const strokeDashArray = computed(() => (props.dashed ? "5, 5" : "none"));
</script>

<template>
  <g>
    <path
      :d="pathD"
      :stroke-dasharray="strokeDashArray"
      :style="{ stroke: 'var(--edge-color)' }"
      stroke-width="1.5"
      fill="none"
    />
    <text
      v-if="label"
      :x="(from.x + to.x) / 2"
      :y="(from.y + to.y) / 2 - 4"
      class="edge-label"
      text-anchor="middle"
    >
      {{ label }}
    </text>
  </g>
</template>

<style scoped>
.edge-label {
  fill: var(--text-secondary);
  font-size: 11px;
  paint-order: stroke;
  stroke: var(--bg-canvas);
  stroke-width: 3px;
  stroke-linejoin: round;
}
</style>
