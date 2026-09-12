<script setup lang="ts">
import { computed } from "vue";
import { isRelationAttribute } from "../data/graph";
import type { GraphAttribute, GraphNode, GraphRelation } from "../data/graph";

const props = defineProps<{
  node: GraphNode;
  relations: GraphRelation[];
}>();
props;

const nodeRelations = computed(() =>
  props.node.relationIds
    .map((id) => props.relations.find((relation) => relation.id === id))
    .filter((relation): relation is GraphRelation => relation !== undefined),
);
const relationsById = computed(
  () => new Map(props.relations.map((relation) => [relation.id, relation])),
);
const attributeRelations = (attribute: GraphAttribute) =>
  isRelationAttribute(attribute)
    ? attribute.relationIds
        .map((id) => relationsById.value.get(id))
        .filter((relation): relation is GraphRelation => relation !== undefined)
    : [];
const isInverseAttribute = (attribute: GraphAttribute) =>
  attributeRelations(attribute)[0]?.kind === "inverse";
const attributes = computed(() =>
  props.node.attributes.filter((attribute) => !isInverseAttribute(attribute)),
);
const inverseAttributes = computed(() =>
  props.node.attributes.filter(isInverseAttribute),
);
const referenceRelations = computed(() =>
  nodeRelations.value.filter((relation) => relation.kind === "reference"),
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
const stringifyAttribute = (attribute: GraphAttribute) =>
  isRelationAttribute(attribute)
    ? attributeRelations(attribute)
        .map((relation) => stringifyId(relation.targetId))
        .join(", ")
    : stringifyValue(attribute.value);
</script>

<template>
  <div class="property-area">
    <h3>Node Details</h3>
    <p><strong>ID:</strong> {{ stringifyId(node.id) }}</p>
    <p><strong>Type:</strong> {{ node.header.primary }}</p>

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

    <template v-if="referenceRelations.length">
      <h4>References</h4>
      <table>
        <thead>
          <tr>
            <th>Content</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="relation in referenceRelations" :key="relation.id">
            <td>{{ stringifyId(relation.targetId) }}</td>
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
