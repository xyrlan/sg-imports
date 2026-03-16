export function toPlainObject<T>(obj: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj ?? {})) as Record<string, unknown>;
}
