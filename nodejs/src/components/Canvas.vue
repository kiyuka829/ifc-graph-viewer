<script setup lang="ts">
import { ref, computed } from "vue";
import axios from "axios";
import NodeComponent from "./NodeComponent.vue";
import EdgeComponent from "./EdgeComponent.vue";

import { Node, Edge, Position, Attribute } from "./interfaces";

// 選択したファイルを保持する変数
const filepath = ref<string>("");

const uploadFile = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    const selectedFile = input.files[0];

    // FormData オブジェクトを作成してファイルを追加
    const formData = new FormData();
    formData.append("file", selectedFile);

    // ファイルをサーバーにアップロード
    axios
      .post("http://localhost:5000/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => {
        // レスポンスを処理
        console.log(response.data.model);
        const node = convertToNode(response.data.model);
        nodes.value.push(node);
        filepath.value = response.data.path;
        console.log(node);
      })
      .catch((error) => {
        // エラー処理
        console.error("ファイルのアップロードに失敗しました:", error);
      });
  }
};

// attributeに値があるかどうか
const hasValue = (value: string | string[]): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  } else {
    return value !== null && value !== undefined && value !== "";
  }
};

// レスポンスデータをNodeに変換
function convertToNode(data: any): Node {
  const node: Node = {
    id: data.id,
    type: data.type,
    attributes: [],
    position: { x: 0, y: 0 },
  };

  // attributes
  let count = 0;
  for (const attr of data.attributes) {
    const attribute = {
      name: attr.name,
      content: attr.value,
      edgePosition: { x: attr.inverse ? 0 : 200, y: 68 + count * 29 },
      inverse: attr.inverse,
      visible: true,
    };
    hasValue(attr.value) && count++;
    node.attributes.push(attribute);
  }

  return node;
}

const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);

// const edges = ref<Edge[]>([
//   {
//     id: "edge1",
//     from: { nodeId: "node1", attrName: "attr1" },
//     to: { nodeId: "node2", attrName: "attr3" },
//   },
// ]);

const updateNodePosition = (
  nodeId: string,
  newPosition: { x: number; y: number }
) => {
  const node = nodes.value.find((c) => c.id === nodeId);
  if (node) {
    node.position = newPosition;
  }
};

const edgePosition = computed(() => {
  return edges.value.map((edge) => {
    const from = edge.from;
    const from_node = nodes.value.find((c) => c.id === from.nodeId);
    const from_attr = from_node?.attributes.find(
      (c) => c.name === from.attrName
    );
    const from_edge = {
      x: (from_node?.position.x ?? 0) + (from_attr?.edgePosition?.x ?? 0),
      y: (from_node?.position.y ?? 0) + (from_attr?.edgePosition?.y ?? 0),
    };

    const to = edge.to;
    const to_node = nodes.value.find((c) => c.id === to.nodeId);
    const to_attr = to_node?.attributes.find((c) => c.name === to.attrName);
    const to_edge = {
      x: (to_node?.position.x ?? 0) + (to_attr?.edgePosition?.x ?? 0),
      y: (to_node?.position.y ?? 0) + (to_attr?.edgePosition?.y ?? 22.5),
    };

    return {
      id: edge.id,
      from: from_edge,
      to: to_edge,
    };
  });
});

const addNode = (
  nodeId: string,
  data: { position: Position; attribute: Attribute }
) => {
  const id = data.attribute.content;

  const to: { nodeId: string; attrName: string } = { nodeId: "", attrName: "" };
  const from: { nodeId: string; attrName: string } = {
    nodeId: "",
    attrName: "",
  };
  if (data.attribute.inverse) {
    to.nodeId = nodeId;
    to.attrName = data.attribute.name;
    from.nodeId = Array.isArray(id) ? id[0].value : id;
  } else {
    from.nodeId = nodeId;
    from.attrName = data.attribute.name;
    to.nodeId = Array.isArray(id) ? id[0].value : id;
  }

  const config = {
    method: "post",
    url: "http://localhost:5000/get_node",
    data: {
      path: filepath.value,
      id: Array.isArray(id) ? id[0].value : id,
    },
  };
  axios(config)
    .then((response) => {
      // レスポンスを処理
      console.log(response.data);
      const node = convertToNode(response.data.node);
      if (
        !nodes.value.find(
          (c) => c.id === (Array.isArray(id) ? id[0].value : id)
        )
      ) {
        node.position = data.position;
        nodes.value.push(node);
      }

      // nodeIdと一致するattributeのnameを取得
      const targetAttr = node.attributes.find((attr) => {
        if (Array.isArray(attr.content)) {
          if (attr.content.find((c) => c.value === nodeId)) {
            return true;
          }
        } else if (typeof attr.content === "number") {
          return attr.content === nodeId;
        } else {
          return false;
        }
      });
      if (data.attribute.inverse) {
        from.attrName = targetAttr?.name;
      } else {
        to.attrName = targetAttr?.name;
      }

      edges.value.push({
        id: "edge1",
        from: from,
        to: to,
      });
    })
    .catch((error) => {
      console.log(error);
    });
};
</script>

<template>
  <input type="file" @change="uploadFile" class="fileInput" />

  <div class="canvas">
    <EdgeComponent
      v-for="edge in edgePosition"
      :key="edge.id"
      :from="edge.from"
      :to="edge.to"
    />
    <NodeComponent
      v-for="(node, _) in nodes"
      :key="node.id"
      :node="node"
      @update:position="updateNodePosition(node.id, $event)"
      @add:node="addNode(node.id, $event)"
    />
  </div>
</template>

<style scoped>
.fileInput {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1;
}
</style>
