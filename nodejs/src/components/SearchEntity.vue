<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { SearchData, SearchItem } from "./interfaces";
import VirtualScroll from "./VirtualScroll.vue";

const props = defineProps<{
  elements: { [key: string]: SearchData };
  lookupElements?: { [key: string]: SearchData } | null;
}>();

const emits = defineEmits(["select", "query"]);

const searchQuery = ref("");
const searchInput = ref<HTMLInputElement | null>(null);
const searchItems = ref<SearchItem[]>([]);

const subMenuTop = ref<number>(0);
const hoverItem = ref<string>("");
const mainList = ref<HTMLElement | null>(null);

const activeElements = computed(
  () => props.lookupElements ?? props.elements
);

// コンポーネントが表示されたらフォーカスを設定
onMounted(() => {
  if (searchInput.value) {
    searchInput.value.focus();
  }
});

const filteredList = computed(() => {
  const keys = Object.keys(activeElements.value);
  if (props.lookupElements !== null && props.lookupElements !== undefined) {
    return keys.sort();
  }
  return keys
    .filter((element) =>
      element.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    .sort();
});

function openSubMenu(item: string, idx: number) {
  if (mainList.value === null) {
    return;
  }
  const elements = activeElements.value;
  if (!elements[item]) {
    return;
  }
  const scrollTop = mainList.value.scrollTop;

  searchItems.value = elements[item].items;
  subMenuTop.value = idx * 23 + 39.5 - scrollTop;
  hoverItem.value = item;
}

const selectItem = (item: string) => {
  // console.log("selectItem", item);
  emits("select", item);
};

const handleClick = (event: MouseEvent) => {
  event.stopPropagation();
};

watch(searchQuery, (value) => {
  emits("query", value);
});

watch(
  () => props.lookupElements,
  async (value) => {
    if (value === undefined || value === null) {
      searchItems.value = [];
      hoverItem.value = "";
      return;
    }
    const keys = Object.keys(value);
    if (keys.length === 0) {
      searchItems.value = [];
      hoverItem.value = "";
      return;
    }
    await nextTick();
    openSubMenu(keys[0], 0);
  }
);
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
          :class="['menu-item', 'truncate-text', { active: item === hoverItem }]"
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
  font-size: 0.8rem;
}

/* Search box */
.search-box {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 6px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-surface);
}

.search-box-text {
  width: 136px;
  padding: 5px 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-panel);
  color: var(--text-primary);
  font-size: 0.8rem;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.search-box-text:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-subtle);
}

.search-box-text::placeholder {
  color: var(--text-muted);
}

/* Wrapper menu panel */
.menu {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  background: var(--bg-surface);
}

/* Main list */
.main-list {
  max-height: 500px;
  overflow: auto;
  background-color: var(--bg-surface);
}

/* Sub-list panel */
.sub-list {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-surface);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.sub-list-container {
  min-width: 150px;
  max-width: 500px;
  max-height: 500px;
  overflow: auto;
}

/* List items */
.menu-item {
  width: 148px;
  height: 23px;
  line-height: 23px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-primary);
}

.main-list .menu-item,
.sub-list .sub-item {
  padding: 2px 8px;
  cursor: pointer;
  transition: background-color 0.12s;
}

.main-list .menu-item:hover,
.sub-list .sub-item:hover {
  background-color: var(--accent-subtle);
  color: var(--accent);
}

/* Highlighted (active sub-menu item) */
.main-list .menu-item.active {
  background-color: var(--accent-subtle);
  color: var(--accent);
}

.sub-list .sub-item {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.sub-list .sub-item:hover {
  color: var(--accent);
}

.truncate-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
