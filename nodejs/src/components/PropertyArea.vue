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
  margin-bottom: 20px;
  padding-bottom: 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

table,
th,
td {
  border: 1px solid #ddd;
  font-size: 0.8rem;
}

th,
td {
  padding: 8px;
  text-align: left;
}

th {
  background-color: #f4f4f4;
}

tbody tr:nth-child(odd) {
  background-color: #f9f9f9;
}

tbody tr:hover {
  background-color: #eef4ff;
}
</style>
