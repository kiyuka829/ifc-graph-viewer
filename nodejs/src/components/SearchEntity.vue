<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{
  elements: { [key: string]: number[] };
}>();
const emits = defineEmits(["select"]);

const searchQuery = ref("");
const ids = ref<number[]>([]);

const subMenuTop = ref<number>(0);
const hoverItem = ref<string>("");
const mainList = ref<HTMLElement | null>(null);

const filteredList = computed(() => {
  return Object.keys(props.elements).filter((element) =>
    element.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

function openSubMenu(item: string, idx: number) {
  if (mainList.value === null) {
    return;
  }
  const scrollTop = mainList.value.scrollTop;

  ids.value = props.elements[item];
  subMenuTop.value = idx * 24 + 26 - scrollTop;
  hoverItem.value = item;
}

const selectItem = (item: number) => {
  // console.log("selectItem", item);
  emits("select", item);
};

const handleClick = (event: MouseEvent) => {
  event.stopPropagation();
};
</script>

<template>
  <div
    class="menu-container"
    :style="{
      position: 'absolute',
      top: 60 + 'px',
      left: 20 + 'px',
    }"
    @click="handleClick"
  >
    <div class="menu">
      <!-- 検索欄 -->
      <div class="search-box">
        <input
          type="text"
          class="search-box-text"
          v-model="searchQuery"
          placeholder="Search"
        />
      </div>

      <div class="main-list" ref="mainList">
        <div
          v-for="(item, idx) in filteredList"
          :key="item"
          @mouseover="openSubMenu(item, idx)"
          class="menu-item truncate-text"
          :style="{
            backgroundColor: item === hoverItem ? '#a7b3e9' : undefined,
          }"
          :title="item"
        >
          {{ item }}
        </div>
      </div>
    </div>

    <div
      class="sub-list"
      :style="{
        position: 'absolute',
        top: subMenuTop + 'px',
        left: 148 + 'px',
      }"
      v-if="ids.length > 0"
    >
      <div
        v-for="id in ids"
        :key="id"
        @click="selectItem(id)"
        class="sub-item truncate-text"
      >
        #{{ id }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-container {
  font-size: small;
}

.search-box {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 150px;
}
.search-box-text {
  width: 140px;
  /* margin-bottom: 20px; */
}

.menu {
  border: 1px solid #ccc;
  /* display: flex; */
}

.main-list {
  max-height: 500px;
  overflow: auto;
  background-color: #f0f0f0;
}
.sub-list {
  border: 1px solid #ccc;
  width: 150px;
  max-height: 500px;
  background-color: #f0f0f0;
  overflow: auto;
}

.menu-item {
  width: 146px;
  /* display: flex; */
  align-items: center;
  justify-content: space-between;
}

.main-list .menu-item,
.sub-list .sub-item {
  padding: 2px;
  /* margin: 5px; */
  /* border: 1px solid #ccc; */
  /* border-radius: 5px; */
  cursor: pointer;
  /* border: 1px solid #dcdcdc; */
}
.main-list .menu-item:hover,
.sub-list .sub-item:hover {
  background-color: #a7b3e9;
}

.truncate-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
