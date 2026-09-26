from typing import Any, List, Literal, Union

from pydantic import BaseModel


class LinkEndpoint(BaseModel):
    attribute: str
    index: int


class ViewLink(BaseModel):
    nodeId: str
    label: str | None = None
    endpoint: LinkEndpoint | None = None


class ValueAttribute(BaseModel):
    name: str
    value: Any


class LinkAttribute(BaseModel):
    name: str
    direction: Literal["outgoing", "incoming"]
    links: list[ViewLink]
    missingNodeIds: list[str] | None = None


class NodeHeader(BaseModel):
    primary: str | None = None
    secondary: str | None = None


class ViewNode(BaseModel):
    id: str
    header: NodeHeader
    attributes: list[ValueAttribute | LinkAttribute]
    incoming: list[ViewLink]


class Content(BaseModel):
    type: Literal["value", "id"]
    value: Any


class Attribute(BaseModel):
    name: str
    content: Content
    inverse: bool


class Node(BaseModel):
    id: Union[int, str]
    type: str
    attributes: List[Attribute]
    references: Attribute
