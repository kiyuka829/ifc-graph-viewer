<script setup lang="ts">
import { IfcNode, AttrContent } from "./interfaces";

const props = defineProps<{
  node: IfcNode;
}>();
props;

const stringifyContents = (contents: AttrContent[]) => {
  if (contents.length === 0) {
    return "";
  } else {
    if (contents[0].type === "id") {
      return contents
        .map((c) => (typeof c.value === "number" ? `#${c.value}` : c.value))
        .join(", ");
    } else {
      return contents
        .map((c) => {
          if (Array.isArray(c.value)) {
            return `(${c.value.join(", ")})`;
          } else {
            return `${c.value}`;
          }
        })
        .join(", ");
    }
  }
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
          <td>{{ stringifyContents(attribute.contents) }}</td>
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
            <td>{{ stringifyContents(attribute.contents) }}</td>
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
            <td>{{ stringifyContents(node.reference.contents) }}</td>
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
