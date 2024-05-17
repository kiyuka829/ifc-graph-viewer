<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as BABYLON from "@babylonjs/core";

const canvasContainer = ref<HTMLDivElement | null>(null);

onMounted(() => {
  if (!canvasContainer.value) return;

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvasContainer.value.appendChild(canvas);

  const engine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(engine);

  const camera = new BABYLON.ArcRotateCamera(
    'camera1',
    Math.PI / 2,
    Math.PI / 4,
    4,
    BABYLON.Vector3.Zero(),
    scene
  );
  camera.attachControl(canvas, true);

  const light = new BABYLON.HemisphericLight(
    'light1',
    new BABYLON.Vector3(1, 1, 0),
    scene
  );

  const box = BABYLON.MeshBuilder.CreateBox('box', {}, scene);

  engine.runRenderLoop(() => {
    scene.render();
  });

  const resizeHandler = () => {
    engine.resize();
  };

  window.addEventListener('resize', resizeHandler);

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resizeHandler);
    engine.dispose();
  });
});
</script>

<template>
  <div ref="canvasContainer" class="canvas-container"></div>
</template>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

</style>
