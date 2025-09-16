from typing import Any, List, Literal, Union

from pydantic import BaseModel


class Content(BaseModel):
    type: Literal["value", "id"]
    value: Any


class Attribute(BaseModel):
    name: str
    # TODO: content: Content に変更する
    contents: List[Content]
    inverse: bool


class Node(BaseModel):
    id: Union[int, str]
    type: str
    attributes: List[Attribute]
    references: Attribute
