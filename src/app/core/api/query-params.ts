export type QueryValue = string | number | null;
export function toQueryParams(values: Readonly<Record<string, QueryValue>>): Record<string, string | number> {
  const entries = Object.entries(values).filter((entry): entry is [string, string | number] => {
    return entry[1] !== null && entry[1] !== '';
  });
  return Object.fromEntries(entries);
}
