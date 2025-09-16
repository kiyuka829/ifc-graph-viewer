import copy
import json
import re
from collections import defaultdict

from models import Attribute, Content, Node

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
    # 同一IDのマージ
    nodes = {}
    for d in data:
        d = copy.deepcopy(d)
        identifier = d.get("path")

        if identifier in nodes:
            nodes[identifier] = merge_node(nodes[identifier], d)
        else:
            nodes[identifier] = merge_node(d, {})

    # name 付与
    for identifier, node in nodes.items():
        children = node.get("children", {})
        inherits = node.get("inherits", {})
        for refs in children, inherits:
            for name, child_id in refs.items():
                nodes.get(child_id, {})["name"] = name

    # ルートに name 付与
    for identifier, node in nodes.items():
        if node.get("name") is None:
            node["name"] = "root"

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


def clear_load_files():
    load_files.clear()
    composed_data.clear()


def load_model(path):
    if path not in load_files:
        with open(path, "r") as f:
            ifcx_file = json.load(f)
        version = ifcx_file.get("header", {}).get("ifcxVersion")
        if re.match("^ifcx[-_]alpha$", version) is None:
            raise ValueError(
                "Invalid version: expected 'ifcx-alpha' or 'ifcx_alpha', "
                f"but got '{version}'"
            )

        load_files[path] = ifcx_file


def compose():
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
    ref_ids = references.get(node["path"], [])

    attributes = []
    for name in ["children", "inherits"]:
        values = list(node.get(name, {}).values())
        if len(values) == 0:
            continue

        content = Content(type="id", value=values)
        attribute = Attribute(name=name, content=content, inverse=False)
        attributes.append(attribute)

    inverse_ids = set()
    for name, value in flatten_dict(node["attributes"]).items():
        if node["path"] != value and isinstance(value, str) and value in nodes:
            content = Content(type="id", value=value)
        else:
            content = Content(type="value", value=value)

        is_inverse = value in ref_ids
        if is_inverse:
            inverse_ids.add(value)
        attributes.append({"name": name, "content": content, "inverse": is_inverse})

    references_ids = [ref_id for ref_id in ref_ids if ref_id not in inverse_ids]
    content = Content(type="id", value=references_ids)
    refs = Attribute(
        name="references",
        content=content,
        inverse=True,
    )

    node_info = Node(
        id=node["path"],
        type=node["name"],
        attributes=attributes,
        references=refs,
    )
    return node_info


def get_by_id(_, id):
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
