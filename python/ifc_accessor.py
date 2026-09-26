from collections import defaultdict

import ifcopenshell

from models import LinkAttribute, NodeHeader, ValueAttribute, ViewLink, ViewNode

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

    for val in search_data.values():
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


def get_header_info(path):
    model = load_model(path)
    header = model.header
    result = {}

    desc = header.file_description
    result["file_description"] = {
        "description": list(desc.description) if desc.description else [],
        "implementation_level": desc.implementation_level or "",
    }

    name = header.file_name
    result["file_name"] = {
        "name": name.name or "",
        "time_stamp": name.time_stamp or "",
        "author": list(name.author) if name.author else [],
        "organization": list(name.organization) if name.organization else [],
        "preprocessor_version": name.preprocessor_version or "",
        "originating_system": name.originating_system or "",
        "authorization": name.authorization or "",
    }

    schema = header.file_schema
    result["file_schema"] = {
        "schemas": list(schema.schema_identifiers) if schema.schema_identifiers else [],
    }

    return result


def attribute_info(key: str, val, inverse: bool):
    def value_or_link(value):
        if value.id() == 0:
            # IFCXX($,$,IFCINTEGER(2),$) みたく直接IFCの場合
            return ValueAttribute(name=key, value=str(value))
        return LinkAttribute(
            name=key,
            direction="incoming" if inverse else "outgoing",
            links=[ViewLink(nodeId=str(value.id()))],
        )

    if isinstance(val, ifcopenshell.entity_instance):
        return value_or_link(val)
    if isinstance(val, tuple) and all(
        isinstance(value, ifcopenshell.entity_instance) for value in val
    ):
        if len(val) > 0 and val[0].id() == 0:
            return ValueAttribute(name=key, value=[str(value) for value in val])
        return LinkAttribute(
            name=key,
            direction="incoming" if inverse else "outgoing",
            links=[ViewLink(nodeId=str(value.id())) for value in val],
        )
    # (0, 0, 0) みたいな座標の場合も含めて scalar として扱う。
    return ValueAttribute(name=key, value=val)


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
    for key, val in item.get_info().items():
        if key not in {"id", "type"}:
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
    node = ViewNode(
        id=str(item.id()),
        header=NodeHeader(primary=item.is_a(), secondary=f"#{item.id()}"),
        attributes=attributes,
        incoming=[ViewLink(nodeId=str(reference.id())) for reference in ref_instances],
    )
    return node.model_dump(mode="json", exclude_unset=True)
