import copy
import json
import re
from collections import defaultdict

from models import Node

load_files = {}
composed_data = {}


def flatten_dict(d, parent_key="", sep="::"):
    items = {}
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.update(flatten_dict(v, new_key, sep=sep))
        else:
            items[new_key] = v
    return items


def merge_node(node, other):
    children = other.get("children", {})
    inherits = other.get("inherits", {})
    attributes = other.get("attributes", {})
    node.setdefault("children", {}).update(children)
    node.setdefault("inherits", {}).update(inherits)
    node.setdefault("attributes", {}).update(attributes)
    return node


def convert_node(data):
    nodes = {}
    for d in data:
        d = copy.deepcopy(d)
        identifier = d.get("identifier")
        children = d.get("children", {})
        inherits = d.get("inherits", {})

        if identifier in nodes:
            nodes[identifier] = merge_node(nodes[identifier], d)
        else:
            nodes[identifier] = merge_node(d, {})

        # 存在しないIDのデータを追加
        for name, child_id in children.items():
            nodes.setdefault(child_id, {"identifier": child_id})
        for name, inherit_id in inherits.items():
            nodes.setdefault(inherit_id, {"identifier": inherit_id})

    # name 付与
    for identifier, node in nodes.items():
        children = node.get("children", {})
        inherits = node.get("inherits", {})
        for refs in children, inherits:
            for name, child_id in refs.items():
                nodes.get(child_id, {})["name"] = name

    # ルートノード
    for identifier, node in nodes.items():
        if node.get("name") is None:
            if "usd::usdshade::material" in node.get("attributes", {}):
                node["name"] = "Material"
            else:
                node["name"] = "root"

    # おかしなデータの修正
    disabled_nodes = []
    for identifier, node in nodes.items():
        children = node.get("children", {})
        inherits = node.get("inherits", {})
        for refs in children, inherits:
            for name, child_id in refs.items():
                disabled_node_id = f"{identifier}/{name}"
                if disabled_node_id in nodes:
                    disabled_node = nodes[disabled_node_id]
                    child_node = nodes[child_id]
                    merge_node(child_node, disabled_node)
                    disabled_nodes.append(disabled_node_id)

    # おかしなデータを削除
    for node_id in disabled_nodes:
        if node_id in nodes:
            del nodes[node_id]

    return nodes


def get_references(nodes):
    references = defaultdict(list)
    for identifier, node in nodes.items():
        children = node.get("children", {})
        inherits = node.get("inherits", {})
        for refs in children, inherits:
            for _, child_id in refs.items():
                references[child_id].append(identifier)

        for _, value in flatten_dict(node["attributes"]).items():
            if isinstance(value, str) and value in nodes:
                references[value].append(identifier)

    return references


def load_model(path):
    if path in load_files:
        return composed_data
    else:
        with open(path, "r") as f:
            ifcx_file = json.load(f)
        version = ifcx_file.get("header", {}).get("version")
        if re.match("^ifcx[-_]alpha$", version) is None:
            raise ValueError(f"Invalid version: expected 'ifcx-alpha' or 'ifcx_alpha', but got '{version}'")

        load_files[path] = ifcx_file
        concat_data = []
        for ifcx_data in load_files.values():
            concat_data += ifcx_data["data"]

        nodes = convert_node(concat_data)
        composed_data["nodes"] = nodes
        composed_data["references"] = get_references(nodes)
        return composed_data


def get_root_nodes(nodes):
    root_nodes = []
    for id_, node in nodes.items():
        if node.get("name") == "root":
            root_nodes.append(node)
    return root_nodes


def get_root_node():
    root_nodes = get_root_nodes(composed_data["nodes"])
    return get_node_info(root_nodes[0])


def get_node_info(node):
    nodes = composed_data["nodes"]
    references = composed_data["references"]

    attributes = []
    for name in ["children", "inherits"]:
        contents = []
        for _, value in node.get(name, {}).items():
            contents.append({"type": "id", "value": value})

        if len(contents) == 0:
            continue

        attributes.append({"name": name, "contents": contents, "inverse": False})

    for name, value in flatten_dict(node["attributes"]).items():
        if isinstance(value, str) and value in nodes:
            contents = [{"type": "id", "value": value}]
        else:
            contents = [{"type": "value", "value": value}]
        attributes.append({"name": name, "contents": contents, "inverse": False})

    contents = []
    for idx, ref_id in enumerate(references.get(node["identifier"], [])):
        contents.append({"type": "id", "value": ref_id})
    refs = {
        "name": "references",
        "contents": contents,
        "inverse": True,
    }

    node_info = {
        "id": node["identifier"],
        "type": node["name"],
        "attributes": attributes,
        "references": refs,
    }

    return Node(**node_info)


def get_by_id(path, id):
    item = composed_data["nodes"].get(id)
    if item is None:
        return None
    return get_node_info(item)


def get_search_data():
    nodes = composed_data["nodes"]
    search_data = defaultdict(lambda: {"items": []})
    for id_, node in nodes.items():
        search_data[node["name"]]["items"].append({"id": id_, "displayName": id_})

    for key, val in search_data.items():
        val["items"].sort(key=lambda x: x["id"])

    return search_data
