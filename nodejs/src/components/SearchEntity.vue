<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{
  elements: string[];
}>();
const emits = defineEmits(["select"]);

const searchQuery = ref("");

const filteredList = computed(() => {
  if (searchQuery.value === "") {
    return [];
  }
  return props.elements.filter((element) =>
    element.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const selectItem = (item: string) => {
  emits("select", item);
};
</script>

<template>
  <div>
    <input type="text" v-model="searchQuery" placeholder="search" />
    <div
      v-for="item in filteredList"
      :key="item"
      @click="selectItem(item)"
      class="clickable-item"
    >
      {{ item }}
    </div>
  </div>
</template>

<style scoped>
.clickable-item {
  cursor: pointer;
  padding: 2px;
  /* margin: 5px; */
  background-color: #f0f0f0;
  border: 1px solid #dcdcdc;
  font-size: small;
}
.clickable-item:hover {
  background-color: #e8e8e8;
}
</style>
