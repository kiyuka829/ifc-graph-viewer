<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { SearchData, SearchItem } from "./interfaces";
import VirtualScroll from "./VirtualScroll.vue";

const props = defineProps<{
  elements: { [key: string]: SearchData };
}>();

const emits = defineEmits(["select"]);

const searchQuery = ref("");
const searchInput = ref<HTMLInputElement | null>(null);
const searchItems = ref<SearchItem[]>([]);

const subMenuTop = ref<number>(0);
const hoverItem = ref<string>("");
const mainList = ref<HTMLElement | null>(null);

// コンポーネントが表示されたらフォーカスを設定
onMounted(() => {
  if (searchInput.value) {
    searchInput.value.focus();
  }
});

const filteredList = computed(() => {
  return Object.keys(props.elements)
    .filter((element) =>
      element.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    .sort();
});

function openSubMenu(item: string, idx: number) {
  if (mainList.value === null) {
    return;
  }
  const scrollTop = mainList.value.scrollTop;

  searchItems.value = props.elements[item].items;
  subMenuTop.value = idx * 23 + 26 - scrollTop;
  hoverItem.value = item;
}

const selectItem = (item: string) => {
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
          ref="searchInput"
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
      v-if="searchItems.length > 0"
    >
      <template v-if="searchItems.length < 40">
        <div class="sub-list-container">
          <div
            v-for="searchItem in searchItems"
            :key="searchItem.id"
            :title="searchItem.displayName"
            @click="selectItem(searchItem.id)"
            class="sub-item truncate-text"
          >
            {{ searchItem.displayName }}
          </div>
        </div>
      </template>
      <template v-else>
        <VirtualScroll
          :items="searchItems"
          :itemHeight="20"
          :containerHeight="500"
          :buffer="5"
        >
          <template #default="{ item }">
            <div
              class="sub-item truncate-text"
              :key="item.id"
              :title="item.displayName"
              @click="selectItem(item.id)"
            >
              {{ item.displayName }}
            </div>
          </template>
        </VirtualScroll>
      </template>
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
  background-color: #f0f0f0;
}
.sub-list-container {
  min-width: 150px;
  max-width: 500px;
  max-height: 500px;
  overflow: auto;
}

.menu-item {
  width: 146px;
  height: 19px;
  line-height: 19px;
  align-items: center;
  justify-content: space-between;
}

.main-list .menu-item,
.sub-list .sub-item {
  padding: 2px;
  cursor: pointer;
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
