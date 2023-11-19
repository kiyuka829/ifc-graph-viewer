<script setup lang="ts">
import { ref, computed } from "vue";
import axios from "axios";
import NodeComponent from "./NodeComponent.vue";
import EdgeComponent from "./EdgeComponent.vue";

import { Node, Edge } from "./interfaces";

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

// レスポンスデータをNodeに変換
function convertToNode(data: any): Node {
  const node: Node = {
    id: data.id,
    type: data.type,
    attributes: [],
    position: { x: 0, y: 0 },
  };

  // attributes
  for (const attr of data.attributes) {
    const attribute = {
      name: attr.name,
      content: attr.value,
      edgePosition: { x: 0, y: 0 },
      inverse: attr.inverse,
      visible: true,
    };
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

  // // 関連するエッジの位置を更新
  // edges.value.forEach(edge => {
  //   if (edge.from.nodeId === nodeId) {
  //     edge.from.position = newPosition;
  //   }
  //   if (edge.to.nodeId === nodeId) {
  //     edge.to.position = newPosition;
  //   }
  // });
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
      y: (to_node?.position.y ?? 0) + (to_attr?.edgePosition?.y ?? 0),
    };
    return {
      id: edge.id,
      from: from_edge,
      to: to_edge,
    };
  });
});

const addNode = (nodeId: string, data: any) => {
  const id = data.attribute.content;
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
      node.position = data.position;
      nodes.value.push(node);
    })
    .catch((error) => {});
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
