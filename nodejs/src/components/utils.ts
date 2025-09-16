import { AttrContent } from "./interfaces";

// attributeに値があるかどうか
export function hasValue(content: AttrContent): boolean {
  if (Array.isArray(content.value)) {
    return content.value.length > 0;
  } else {
    return content.value != null;
  }
}
