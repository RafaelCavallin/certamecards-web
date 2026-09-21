const DIACRITICS_PATTERN = /[̀-ͯ]/g;
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .toLowerCase()
    .trim();
}
