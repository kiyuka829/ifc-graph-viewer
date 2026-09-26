<script setup lang="ts">
import { computed } from "vue";
import { isLinkAttribute } from "../data/graph";
import type { ViewAttribute, ViewNode } from "../data/graph";

const props = defineProps<{
  node: ViewNode;
}>();
const attributes = computed(() =>
  props.node.attributes.filter(
    (attribute) => !isLinkAttribute(attribute) || attribute.direction === "outgoing",
  ),
);
const inverseAttributes = computed(() =>
  props.node.attributes.filter(
    (attribute) => isLinkAttribute(attribute) && attribute.direction === "incoming",
  ),
);
const references = computed(() =>
  props.node.incoming.map((link) => stringifyId(link.nodeId)).join(", "),
);

const stringifyValue = (value: any): string => {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return `[${value.map(stringifyValue).join(", ")}]`;
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return `${value}`;
};
const isIfc = computed(() => props.node.header.secondary?.startsWith("#") ?? false);
const stringifyId = (id: string) => (isIfc.value ? `#${id}` : id);
const stringifyAttribute = (attribute: ViewAttribute) =>
  isLinkAttribute(attribute)
    ? [
        ...attribute.links.map((link) => stringifyId(link.nodeId)),
        ...(attribute.missingNodeIds ?? []).map(
          (id) => `${stringifyId(id)} (Not found)`,
        ),
      ].join(", ")
    : stringifyValue(attribute.value);
</script>

<template>
  <div class="property-area">
    <h3>Node Details</h3>
    <p><strong>ID:</strong> {{ stringifyId(node.id) }}</p>
    <p v-if="node.header.primary"><strong>Type:</strong> {{ node.header.primary }}</p>

    <h4>Attributes</h4>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Content</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(attribute, index) in attributes" :key="index">
          <td>{{ attribute.name }}</td>
          <td>{{ stringifyAttribute(attribute) }}</td>
        </tr>
      </tbody>
    </table>

    <template v-if="inverseAttributes.length">
      <h4>Inverse Attributes</h4>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Content</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(attribute, index) in inverseAttributes" :key="index">
            <td>{{ attribute.name }}</td>
            <td>{{ stringifyAttribute(attribute) }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-if="node.incoming.length">
      <h4>References</h4>
      <table>
        <thead>
          <tr>
            <th>Content</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ references }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<style scoped>
.property-area {
  padding: 16px;
}

.property-area h3 {
  margin: 0 0 12px;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
}

.property-area h4 {
  margin: 14px 0 6px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.property-area p {
  margin: 4px 0;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.property-area p strong {
  color: var(--text-secondary);
  font-weight: 600;
  margin-right: 4px;
}

table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

th,
td {
  padding: 6px 10px;
  text-align: left;
  font-size: 0.875rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

th {
  background-color: var(--bg-panel);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.04em;
}

tbody tr:nth-child(even) {
  background-color: var(--bg-panel);
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:hover {
  background-color: var(--accent-subtle);
}
</style>
