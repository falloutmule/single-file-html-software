export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

function describeValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Produce a recursively key-sorted JSON value. Reject values whose JSON output
 * could vary by host behavior or omit information implicitly.
 */
export function canonicalizeJson(value: unknown): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Canonical JSON does not allow non-finite numbers.");
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }

  if (typeof value === "object" && isPlainObject(value)) {
    const canonicalObject: Record<string, JsonValue> = {};

    for (const key of Object.keys(value).sort()) {
      canonicalObject[key] = canonicalizeJson(value[key]);
    }

    return canonicalObject;
  }

  throw new TypeError(`Canonical JSON does not allow ${describeValue(value)} values.`);
}

export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(canonicalizeJson(value));
}
