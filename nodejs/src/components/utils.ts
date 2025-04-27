import { AttrContent } from "./interfaces";

// attributeに値があるかどうか
export function hasValue(contents: AttrContent[]): boolean {
  return contents.length > 0;
}
