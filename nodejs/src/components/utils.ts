export const hasValue = (value: unknown): boolean =>
  Array.isArray(value) ? value.length > 0 : value != null;

export const INCOMING_PORT_ID = "incoming";
export const attributePortId = (index: number): string => `attribute:${index}`;
