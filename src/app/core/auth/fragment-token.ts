export function parseFragmentToken(fragment: string | null, paramName: string): string {
  if (fragment === null) {
    return '';
  }
  return new URLSearchParams(fragment).get(paramName) ?? '';
}
