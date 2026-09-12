import sys, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))
import ifcopenshell, ifc_accessor

out = Path(__file__).resolve().parent / "fixtures"
for schema in ["IFC2X3", "IFC4", "IFC4X3"]:
    m = ifcopenshell.file(schema=schema)
    m.header.file_name.time_stamp = "2026-09-11T00:00:00"
    project = m.create_entity(
        "IfcProject", GlobalId="0000000000000000000001", Name="検証プロジェクト"
    )
    point = m.create_entity("IfcCartesianPoint", Coordinates=(1.25, 2.0, 3.0))
    axis = m.create_entity("IfcAxis2Placement3D", Location=point)
    placement = m.create_entity("IfcLocalPlacement", RelativePlacement=axis)
    wall = m.create_entity(
        "IfcWall",
        GlobalId="00000000000000000000A2",
        Name="壁 A",
        ObjectPlacement=placement,
    )
    m.create_entity(
        "IfcRelAggregates",
        GlobalId="0000000000000000000003",
        RelatingObject=project,
        RelatedObjects=[wall],
    )
    props = []
    for name, kind, value in [
        ("Length", "IfcLengthMeasure", 1.25),
        ("Text", "IfcLabel", "日本語 O'Brien"),
        ("Flag", "IfcBoolean", True),
        ("Unknown", "IfcLogical", "UNKNOWN"),
    ]:
        props.append(
            m.create_entity(
                "IfcPropertySingleValue",
                Name=name,
                NominalValue=m.create_entity(kind, value),
            )
        )
    pset = m.create_entity(
        "IfcPropertySet",
        GlobalId="0000000000000000000004",
        Name="Test",
        HasProperties=props,
    )
    m.create_entity(
        "IfcRelDefinesByProperties",
        GlobalId="0000000000000000000005",
        RelatedObjects=[wall],
        RelatingPropertyDefinition=pset,
    )
    m.create_entity("IfcPolyline", Points=[point, point])
    m.create_entity("IfcSIUnit", UnitType="LENGTHUNIT", Name="METRE")
    m.write(str(out / f"{schema.lower()}.ifc"))
    json.dump(
        [ifc_accessor.get_node_info(m, item) for item in m],
        open(out / f"{schema.lower()}.expected.json", "w"),
        ensure_ascii=False,
        indent=2,
    )
