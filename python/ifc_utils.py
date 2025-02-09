from collections import defaultdict

import ifcopenshell

load_models = {}


def load_model(path):
    if path in load_models:
        return load_models[path]
    else:
        model = ifcopenshell.open(path)
        load_models[path] = model
        return model


def get_ifcproject(path):
    model = load_model(path)
    item = model.by_type("IfcProject")[0]
    return get_node_info(model, item)


def get_by_id(path, id):
    model = load_model(path)
    item = model.by_id(id)
    return get_node_info(model, item)


def get_by_type(path, type):
    model = load_model(path)
    item = model.by_type(type)[0]
    return get_node_info(model, item)


def get_entities(path):
    model = load_model(path)
    entities = defaultdict(list)
    for item in model:
        entities[item.is_a()].append(item.id())
    for key, val in entities.items():
        val.sort()
    return entities


def get_lines(path):
    model = load_model(path)
    entities = []
    for item in model:
        entities.append((item.id(), item.is_a()))
    return sorted(entities)


def attribute_info(key, val):
    def _instance2content(val):
        if val.id() == 0:
            # IFCXX($,$,IFCINTEGER(2),$) みたく直接IFCの場合
            return dict(type="value", value=val.wrappedValue)
        else:
            return dict(type="id", value=val.id())

    if isinstance(val, ifcopenshell.entity_instance):
        return dict(name=key, content=_instance2content(val))
    elif isinstance(val, tuple):
        values = []
        for v in val:
            if isinstance(v, ifcopenshell.entity_instance):
                content = _instance2content(v)
                values.append(content)
            else:
                # (0, 0, 0) みたいな座標の場合
                values.append(dict(type="value", value=v))

        return dict(name=key, content=values)
    else:
        return dict(name=key, content=dict(type="value", value=val))


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
    references = []
    for idx, reference in enumerate(ref_instances):
        key = f"reference{idx}"
        ref = attribute_info(key, reference)
        ref["inverse"] = True
        references.append(ref)
    node_info["references"] = references

    return node_info


if __name__ == "__main__":
    pass
