<script setup lang="ts">
import { HeaderEntry, IfcHeader, IfcHeaderValue, IfcStructuredHeader } from "./interfaces";

interface HeaderRow {
  key: string;
  value: string;
}

defineProps<{
  headers: HeaderEntry[];
}>();

const isPlainObject = (value: IfcHeaderValue): value is IfcHeader =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const formatPrimitive = (value: string | number | boolean | null): string => {
  if (value === null) {
    return "null";
  }
  return String(value);
};

const flattenHeaderValue = (value: IfcHeaderValue, keyPath = ""): HeaderRow[] => {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [{ key: keyPath || "(root)", value: "[]" }];
    }
    if (value.every((item) => !Array.isArray(item) && !isPlainObject(item))) {
      return [{ key: keyPath || "(root)", value: JSON.stringify(value) }];
    }
    return value.flatMap((item, index) =>
      flattenHeaderValue(item, `${keyPath || "(root)"}[${index}]`),
    );
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return [{ key: keyPath || "(root)", value: "{}" }];
    }
    return entries.flatMap(([key, child]) =>
      flattenHeaderValue(child, keyPath ? `${keyPath}.${key}` : key),
    );
  }

  return [{ key: keyPath || "(root)", value: formatPrimitive(value) }];
};

const getHeaderRows = (header: IfcHeader): HeaderRow[] => flattenHeaderValue(header);
const getIfcHeader = (header: IfcHeader): IfcStructuredHeader => header as IfcStructuredHeader;
</script>

<template>
  <div class="header-info-area">
    <h3>File Header</h3>

    <div v-for="entry in headers" :key="entry.filename" class="header-block">
      <p class="filename-label">{{ entry.filename }}</p>

      <template v-if="entry.format === 'ifc'">
        <template v-if="getIfcHeader(entry.header).file_schema">
          <h4>FILE_SCHEMA</h4>
          <table>
            <tbody>
              <tr>
                <td class="key-cell">Schema</td>
                <td>
                  {{
                    getIfcHeader(entry.header).file_schema?.schemas.length
                      ? getIfcHeader(entry.header).file_schema?.schemas.join(", ")
                      : "—"
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </template>

        <template v-if="getIfcHeader(entry.header).file_name">
          <h4>FILE_NAME</h4>
          <table>
            <tbody>
              <tr>
                <td class="key-cell">Name</td>
                <td>{{ getIfcHeader(entry.header).file_name?.name || "—" }}</td>
              </tr>
              <tr>
                <td class="key-cell">Time Stamp</td>
                <td>{{ getIfcHeader(entry.header).file_name?.time_stamp || "—" }}</td>
              </tr>
              <tr>
                <td class="key-cell">Author</td>
                <td>
                  {{
                    getIfcHeader(entry.header).file_name?.author.length
                      ? getIfcHeader(entry.header).file_name?.author.join(", ")
                      : "—"
                  }}
                </td>
              </tr>
              <tr>
                <td class="key-cell">Organization</td>
                <td>
                  {{
                    getIfcHeader(entry.header).file_name?.organization.length
                      ? getIfcHeader(entry.header).file_name?.organization.join(", ")
                      : "—"
                  }}
                </td>
              </tr>
              <tr>
                <td class="key-cell">Preprocessor</td>
                <td>
                  {{ getIfcHeader(entry.header).file_name?.preprocessor_version || "—" }}
                </td>
              </tr>
              <tr>
                <td class="key-cell">Originating System</td>
                <td>
                  {{ getIfcHeader(entry.header).file_name?.originating_system || "—" }}
                </td>
              </tr>
              <tr>
                <td class="key-cell">Authorization</td>
                <td>{{ getIfcHeader(entry.header).file_name?.authorization || "—" }}</td>
              </tr>
            </tbody>
          </table>
        </template>

        <template v-if="getIfcHeader(entry.header).file_description">
          <h4>FILE_DESCRIPTION</h4>
          <table>
            <tbody>
              <tr>
                <td class="key-cell">Description</td>
                <td>
                  {{
                    getIfcHeader(entry.header).file_description?.description.length
                      ? getIfcHeader(entry.header).file_description?.description.join(", ")
                      : "—"
                  }}
                </td>
              </tr>
              <tr>
                <td class="key-cell">Implementation Level</td>
                <td>
                  {{ getIfcHeader(entry.header).file_description?.implementation_level || "—" }}
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </template>

      <template v-else>
        <table>
          <tbody>
            <tr
              v-for="row in getHeaderRows(entry.header)"
              :key="`${entry.filename}:${row.key}`"
            >
              <td class="key-cell">{{ row.key }}</td>
              <td>{{ row.value }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>
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

.header-block + .header-block {
  margin-top: 16px;
}

.filename-label {
  margin: 12px 0 8px;
  font-size: 0.78rem;
  font-weight: 600;
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
