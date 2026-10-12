/**
 * GraphQL enum helpers for the Google module.
 *
 * Google REST APIs return enum-like values in their own casing:
 *   Calendar  status:         "confirmed" | "tentative" | "cancelled"
 *   Calendar  responseStatus: "needsAction" | "declined" | "tentative" | "accepted"
 *   Tasks     status:         "needsAction" | "completed"
 *
 * The module's GraphQL enums use UPPER_SNAKE_CASE. Passing the raw value straight
 * through makes GraphQL throw `Enum "<X>" cannot represent value: "<y>"` and drops
 * the field. These helpers normalise Google values to the enum spelling.
 */

/**
 * Normalise a Google enum-ish value to UPPER_SNAKE_CASE.
 * `"confirmed"` → `CONFIRMED`; `"needsAction"` → `NEEDS_ACTION`.
 * Returns `null` for null/undefined/empty so the field is omitted rather than errored.
 */
export function toGraphQLEnum(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  return raw
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2') // camelCase → camel_Case
    .replace(/[^A-Za-z0-9]+/g, '_')         // separators → underscore
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

/** Map a list of raw values, preserving nulls. */
export function toGraphQLEnums(values: unknown[] | undefined): (string | null)[] | undefined {
  if (!Array.isArray(values)) return undefined;
  return values.map(toGraphQLEnum);
}
