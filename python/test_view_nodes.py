import unittest
from pathlib import Path

import ifc_accessor as ifc


class IfcViewNodeTest(unittest.TestCase):
    def test_returns_json_ready_view_node(self):
        path = Path(__file__).parent.parent / "nodejs/tests/fixtures/ifc4.ifc"

        node = ifc.get_ifc_project(path)

        self.assertEqual(node["id"], "1")
        self.assertEqual(node["header"], {"primary": "IfcProject", "secondary": "#1"})
        attributes = {attribute["name"]: attribute for attribute in node["attributes"]}
        self.assertEqual(
            attributes["OwnerHistory"], {"name": "OwnerHistory", "value": None}
        )
        self.assertEqual(
            attributes["IsDecomposedBy"],
            {
                "name": "IsDecomposedBy",
                "direction": "incoming",
                "links": [{"nodeId": "6"}],
            },
        )
        self.assertEqual(node["incoming"], [])


if __name__ == "__main__":
    unittest.main()
