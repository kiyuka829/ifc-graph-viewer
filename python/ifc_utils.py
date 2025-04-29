from collections import defaultdict
from typing import Any, List, Literal

import ifcopenshell
from pydantic import BaseModel

load_models = {}


class Content(BaseModel):
    type: Literal["value", "id"]
    value: Any


class Attribute(BaseModel):
    name: str
    contents: List[Content]
    inverse: bool


class Node(BaseModel):
    id: int
    type: str
    attributes: List[Attribute]
    references: Attribute


def load_model(path):
    if path in load_models:
        return load_models[path]
    else:
        model = ifcopenshell.open(path)
        load_models[path] = model
        return model


def get_ifc_project(path):
    model = load_model(path)
    item = model.by_type("IfcProject")[0]
    return get_node_info(model, item)


def get_by_id(path, id):
    model = load_model(path)
    item = model.by_id(id)
    return get_node_info(model, item)


def get_search_data(path):
    model = load_model(path)
    search_data = defaultdict(lambda: {"items": []})
    for item in model:
        display_names = [f"#{item.id()}"]
        info = item.get_info()
        if (guid := info.get("GlobalId")) is not None:
            display_names.append(guid)
        if (name := info.get("Name")) is not None:
            display_names.append(name)

        search_data[item.is_a()]["items"].append(
            {
                "id": item.id(),
                "displayName": " | ".join(display_names),
            }
        )

    for key, val in search_data.items():
        val["items"].sort(key=lambda x: x["id"])

    return search_data


def attribute_info(key, val):
    def _instance2content(val):
        if val.id() == 0:
            # IFCXX($,$,IFCINTEGER(2),$) みたく直接IFCの場合
            return dict(type="value", value=val.wrappedValue)
        else:
            return dict(type="id", value=val.id())

    if isinstance(val, ifcopenshell.entity_instance):
        return dict(name=key, contents=[_instance2content(val)])
    elif isinstance(val, tuple):
        values = []
        for v in val:
            if isinstance(v, ifcopenshell.entity_instance):
                content = _instance2content(v)
                values.append(content)
            else:
                # (0, 0, 0) みたいな座標の場合
                values.append(dict(type="value", value=v))

        return dict(name=key, contents=values)
    else:
        if val is None:
            return dict(name=key, contents=[])
        else:
            return dict(name=key, contents=[dict(type="value", value=val)])


def get_node_info(model, item):
    """
    Get information about a node.

    Args:
        item: The node item.

    Returns:
        dict: A dictionary containing the node information.
            - 'id': The ID of the node.
            - 'type': The type of the node.
            - 'attributes': A list of attributes of the node.
    """
    attributes = []
    node_info = {}
    node_info["attributes"] = attributes
    for key, val in item.get_info().items():
        if key == "id":
            node_info["id"] = val
        elif key == "type":
            node_info["type"] = val
        else:
            attr = attribute_info(key, val)
            attr["inverse"] = False
            attributes.append(attr)

    inv_keys = item.wrapped_data.get_inverse_attribute_names()
    inverses = []
    for key in inv_keys:
        val = getattr(item, key)
        inverses += val
        attr = attribute_info(key, val)
        attr["inverse"] = True
        attributes.append(attr)

    ref_instances = set(model.get_inverse(item)) - set(inverses)
    contents = []
    for idx, reference in enumerate(ref_instances):
        contents.append({"type": "id", "value": reference.id()})
    node_info["references"] = {
        "name": "references",
        "contents": contents,
        "inverse": True,
    }

    return Node(**node_info).model_dump()


if __name__ == "__main__":
    pass
