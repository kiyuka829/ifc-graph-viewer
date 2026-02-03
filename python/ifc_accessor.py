from collections import defaultdict

import ifcopenshell
from models import Attribute, Content, Node

load_models = {}


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
    item = model.by_id(int(id))
    return get_node_info(model, item)


def build_display_name(item):
    display_names = [f"#{item.id()}"]
    info = item.get_info()
    if (guid := info.get("GlobalId")) is not None:
        display_names.append(guid)
    if (name := info.get("Name")) is not None:
        display_names.append(name)
    return " | ".join(display_names)


def build_search_item(item):
    return {
        "id": item.id(),
        "displayName": build_display_name(item),
    }


def get_search_data(path):
    model = load_model(path)
    search_data = defaultdict(lambda: {"items": []})
    for item in model:
        search_data[item.is_a()]["items"].append(build_search_item(item))

    for key, val in search_data.items():
        val["items"].sort(key=lambda x: x["id"])

    return search_data


def get_search_item_by_id(path, id):
    model = load_model(path)
    try:
        item = model.by_id(int(id))
        return item.is_a(), build_search_item(item)
    except RuntimeError:
        return None


def get_search_item_by_global_id(path, global_id):
    model = load_model(path)
    try:
        item = model.by_guid(global_id)
        return item.is_a(), build_search_item(item)
    except RuntimeError:
        return None


def attribute_info(key: str, val, inverse: bool) -> Attribute:
    def _instance2content(val):
        if val.id() == 0:
            # IFCXX($,$,IFCINTEGER(2),$) みたく直接IFCの場合
            return Content(type="value", value=val.wrappedValue)
        else:
            return Content(type="id", value=val.id())

    if isinstance(val, ifcopenshell.entity_instance):
        return Attribute(name=key, content=_instance2content(val), inverse=inverse)
    elif isinstance(val, tuple):
        if all(isinstance(v, ifcopenshell.entity_instance) for v in val):
            values = [_instance2content(v).value for v in val]
            content = Content(type="id", value=values)
            return Attribute(name=key, content=content, inverse=inverse)
        else:
            # (0, 0, 0) みたいな座標の場合
            content = Content(type="value", value=val)
            return Attribute(name=key, content=content, inverse=inverse)
    else:
        content = Content(type="value", value=val)
        return Attribute(name=key, content=content, inverse=inverse)


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
            attr = attribute_info(key, val, inverse=False)
            attributes.append(attr)

    inv_keys = item.wrapped_data.get_inverse_attribute_names()
    inverses = []
    for key in inv_keys:
        val = getattr(item, key)
        inverses += val
        attr = attribute_info(key, val, inverse=True)
        attributes.append(attr)

    ref_instances = set(model.get_inverse(item)) - set(inverses)
    reference_ids = [reference.id() for reference in ref_instances]
    node_info["references"] = Attribute(
        name="references",
        content=Content(type="id", value=reference_ids),
        inverse=True,
    )

    return Node(**node_info).model_dump()
