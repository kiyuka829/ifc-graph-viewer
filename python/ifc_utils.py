import ifcopenshell
from collections import defaultdict

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
    return get_node_info(item)


def get_by_id(path, id):
    model = load_model(path)
    item = model.by_id(id)
    return get_node_info(item)


def get_by_type(path, type):
    model = load_model(path)
    item = model.by_type(type)[0]
    return get_node_info(item)
    items = model.by_type(type)
    return [get_node_info(item) for item in items]


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
    if isinstance(val, ifcopenshell.entity_instance):
        if val.id() == 0:
            # IFCXX($,$,IFCINTEGER(2),$) みたく直接IFCの場合
            content = dict(type="value", value=val.wrappedValue)
            return dict(name=key, content=content)
        else:
            return dict(name=key, content=dict(type="id", value=val.id()))
    elif isinstance(val, tuple):
        values = []
        for v in val:
            if isinstance(v, ifcopenshell.entity_instance):
                values.append(dict(type="id", value=v.id()))
            else:
                # (0, 0, 0) みたいな座標の場合
                values.append(dict(type="value", value=v))

        return dict(name=key, content=values)
    else:
        return dict(name=key, content=dict(type="value", value=val))


def get_node_info(item):
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
    # inverse_attributes = []
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

    inv_keys = (
        set(dir(item))
        - set(dir(ifcopenshell.entity_instance))
        - set(item.get_info().keys())
    )
    for key in inv_keys:
        val = getattr(item, key)
        attr = attribute_info(key, val)
        attr["inverse"] = True
        attributes.append(attr)

    return node_info


if __name__ == "__main__":
    print(get_ifcproject())
