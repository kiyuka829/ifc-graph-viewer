<script setup lang="ts">
import { IfcHeader } from "./interfaces";

defineProps<{
  header: IfcHeader;
  filename: string;
}>();
</script>

<template>
  <div class="header-info-area">
    <h3>File Header</h3>
    <p class="filename-label">{{ filename }}</p>

    <!-- IFC: FILE_DESCRIPTION -->
    <template v-if="header.file_description">
      <h4>FILE_DESCRIPTION</h4>
      <table>
        <tbody>
          <tr>
            <td class="key-cell">Description</td>
            <td>{{ header.file_description.description.length ? header.file_description.description.join(", ") : "—" }}</td>
          </tr>
          <tr>
            <td class="key-cell">Implementation Level</td>
            <td>{{ header.file_description.implementation_level || "—" }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- IFC: FILE_NAME -->
    <template v-if="header.file_name">
      <h4>FILE_NAME</h4>
      <table>
        <tbody>
          <tr>
            <td class="key-cell">Name</td>
            <td>{{ header.file_name.name || "—" }}</td>
          </tr>
          <tr>
            <td class="key-cell">Time Stamp</td>
            <td>{{ header.file_name.time_stamp || "—" }}</td>
          </tr>
          <tr>
            <td class="key-cell">Author</td>
            <td>{{ header.file_name.author.length ? header.file_name.author.join(", ") : "—" }}</td>
          </tr>
          <tr>
            <td class="key-cell">Organization</td>
            <td>{{ header.file_name.organization.length ? header.file_name.organization.join(", ") : "—" }}</td>
          </tr>
          <tr>
            <td class="key-cell">Preprocessor</td>
            <td>{{ header.file_name.preprocessor_version || "—" }}</td>
          </tr>
          <tr>
            <td class="key-cell">Originating System</td>
            <td>{{ header.file_name.originating_system || "—" }}</td>
          </tr>
          <tr>
            <td class="key-cell">Authorization</td>
            <td>{{ header.file_name.authorization || "—" }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- IFC: FILE_SCHEMA -->
    <template v-if="header.file_schema">
      <h4>FILE_SCHEMA</h4>
      <table>
        <tbody>
          <tr>
            <td class="key-cell">Schema</td>
            <td>{{ header.file_schema.schemas.length ? header.file_schema.schemas.join(", ") : "—" }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- IFCX: version -->
    <template v-if="header.ifcx_version">
      <h4>IFCX Header</h4>
      <table>
        <tbody>
          <tr>
            <td class="key-cell">Version</td>
            <td>{{ header.ifcx_version }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<style scoped>
.header-info-area {
  padding: 16px;
}

.header-info-area h3 {
  margin: 0 0 4px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
}

.filename-label {
  margin: 4px 0 12px;
  font-size: 0.78rem;
  color: var(--text-muted);
  word-break: break-all;
}

.header-info-area h4 {
  margin: 14px 0 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

td {
  padding: 6px 10px;
  text-align: left;
  font-size: 0.78rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
  word-break: break-all;
}

.key-cell {
  background-color: var(--bg-panel);
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  width: 40%;
}

tr:last-child td {
  border-bottom: none;
}

tr:hover td {
  background-color: var(--accent-subtle);
}

tr:hover .key-cell {
  background-color: var(--accent-subtle);
}
</style>
