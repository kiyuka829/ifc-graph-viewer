
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
    item = model.by_type('IfcProject')[0]
    return get_node_info(item)

def attribute_info(key, val):
    if isinstance(val, ifcopenshell.entity_instance):
        return dict(
#             name=val.is_a(),
            name=key,
            attribute_type='id',
            value=val.id(),
        )
    elif isinstance(val, tuple):
        values = []
        for v in val:
            if isinstance(v, ifcopenshell.entity_instance):
                values.append(dict(
#                     name=v.is_a(),
                    attribute_type='id',
                    value=v.id(),
                ))
            else:
                # これ存在するの？
                print('@@@@@@@@@@@@@@@', key, val)
                values.append(dict(
#                     name=key,
                    attribute_type='value',
                    value=v,
                ))

        return dict(
            name=key,
            attribute_type='list',
            value=values,
        )
    else:
        return dict(
            name=key,
            attribute_type='value',
            value=val,
        )

def get_node_info(item):
    attributes = []
    inverse_attributes = []
    node_info = {}
    node_info['attributes'] = attributes
    node_info['inverse_attributes'] = inverse_attributes
    for key, val in item.get_info().items():
        if key == 'id':
            node_info['id'] = val
        elif key == 'type':
            node_info['type'] = val
        else:
            attributes.append(attribute_info(key, val))

    inv_keys = set(dir(item)) - set(dir(ifcopenshell.entity_instance)) - set(item.get_info().keys())
    for key in inv_keys:
        val = getattr(item, key)
        inverse_attributes.append(attribute_info(key, val))

    return node_info

if __name__ == "__main__":
    print(get_ifcproject())
