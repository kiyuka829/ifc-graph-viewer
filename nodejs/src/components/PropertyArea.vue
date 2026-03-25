<script setup lang="ts">
import { IfcNode, AttrContent } from "./interfaces";

const props = defineProps<{
  node: IfcNode;
}>();
props;

const stringifyValue = (value: any): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stringifyValue).join(", ")}]`;
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return `${value}`;
};
const stringifyId = (value: any): string => {
  // TODO: ifc, ifcx のID判定表記処理がごり押しなので注意
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === "number" ? `#${v}` : v)).join(", ");
  }
  return typeof value === "number" ? `#${value}` : `${value}`;
};
const stringifyContents = (content: AttrContent): string => {
  if (!content || content.value == null) return "";

  if (content.type === "id") {
    return stringifyId(content.value);
  }
  return stringifyValue(content.value);
};
</script>

<template>
  <div class="property-area">
    <h3>Node Details</h3>
    <p><strong>ID:</strong> {{ node.id }}</p>
    <p><strong>Type:</strong> {{ node.type }}</p>

    <h4>Attributes</h4>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Content</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="attribute in node.attributes.filter((attr) => !attr.inverse)"
          :key="attribute.name"
        >
          <td>{{ attribute.name }}</td>
          <td>{{ stringifyContents(attribute.content) }}</td>
        </tr>
      </tbody>
    </table>

    <template v-if="node.attributes.some((attr) => attr.inverse)">
      <h4>Inverse Attributes</h4>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Content</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="attribute in node.attributes.filter((attr) => attr.inverse)"
            :key="attribute.name"
          >
            <td>{{ attribute.name }}</td>
            <td>{{ stringifyContents(attribute.content) }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-if="node.reference">
      <h4>References</h4>
      <table>
        <thead>
          <tr>
            <th>Content</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ stringifyContents(node.reference.content) }}</td>
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
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
}

.property-area h4 {
  margin: 14px 0 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.property-area p {
  margin: 4px 0;
  font-size: 0.8rem;
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
  font-size: 0.78rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

th {
  background-color: var(--bg-panel);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 0.7rem;
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
