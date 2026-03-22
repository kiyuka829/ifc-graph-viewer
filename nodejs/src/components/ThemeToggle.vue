<script setup lang="ts">
import { ref, onMounted } from "vue";

const isDark = ref(false);

const applyTheme = (dark: boolean) => {
  if (dark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem("theme", dark ? "dark" : "light");
};

onMounted(() => {
  // Sync with whatever was applied by the inline script in index.html
  isDark.value =
    document.documentElement.getAttribute("data-theme") === "dark";
});

const toggle = () => {
  isDark.value = !isDark.value;
  applyTheme(isDark.value);
};
</script>

<template>
  <button
    class="theme-toggle"
    :class="{ dark: isDark }"
    :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
    @click.stop="toggle"
    @mousedown.stop
  >
    <span class="toggle-track">
      <span class="toggle-thumb"></span>
    </span>
    <span class="toggle-label">{{ isDark ? "🌙" : "☀️" }}</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 6px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--text-secondary);
  box-shadow: var(--shadow-sm);
  transition:
    background-color 0.2s,
    box-shadow 0.2s,
    border-color 0.2s;
  white-space: nowrap;
}

.theme-toggle:hover {
  background: var(--bg-panel-hover);
  box-shadow: var(--shadow-md);
}

/* Pill track */
.toggle-track {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 18px;
  background: var(--border-color-strong);
  border-radius: 9px;
  transition: background 0.3s;
  flex-shrink: 0;
}

.theme-toggle.dark .toggle-track {
  background: var(--accent);
}

/* Sliding thumb */
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: #ffffff;
  border-radius: 50%;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.theme-toggle.dark .toggle-thumb {
  transform: translateX(14px);
}

.toggle-label {
  font-size: 0.85rem;
  line-height: 1;
}
</style>
