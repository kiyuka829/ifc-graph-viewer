import { AttrContent } from "./interfaces";

// attributeに値があるかどうか
export function hasValue(content: AttrContent | AttrContent[]): boolean {
  if (Array.isArray(content)) {
    return content.length > 0;
  } else {
    const value = content.value;
    return value !== null && value !== undefined && value !== "";
  }
}
