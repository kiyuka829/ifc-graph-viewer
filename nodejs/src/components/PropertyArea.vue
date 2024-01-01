<script setup lang="ts">
import { IfcNode, AttrContent } from "./interfaces";

const props = defineProps<{
  node: IfcNode;
}>();
props;

const stringifyContent = (content: AttrContent | AttrContent[]) => {
  if (Array.isArray(content)) {
    if (content.length === 0) {
      return "";
    } else {
      if (content[0].type === "id") {
        return content.map((c) => `#${c.value}`).join(", ");
      } else {
        return content.map((c) => `${c.value}`).join(", ");
      }
    }
  } else {
    if (content.value === null) {
      return "";
    } else if (content.type === "id") {
      return `#${content.value}`;
    } else {
      return `${content.value}`;
    }
  }
};
</script>

<template>
  <div>
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
        <tr v-for="attribute in node.attributes" :key="attribute.name">
          <td>{{ attribute.name }}</td>
          <td>{{ stringifyContent(attribute.content) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style>
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
