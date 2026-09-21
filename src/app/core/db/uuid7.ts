const VERSION_MASK = 0x0f;
const VERSION_BITS = 0x70;
const VARIANT_MASK = 0x3f;
const VARIANT_BITS = 0x80;
const BYTE_MASK = 0xff;
const TIMESTAMP_BYTE_COUNT = 6;
export function generateUuidV7(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  writeTimestamp(bytes, Date.now());
  bytes[6] = ((bytes[6] ?? 0) & VERSION_MASK) | VERSION_BITS;
  bytes[8] = ((bytes[8] ?? 0) & VARIANT_MASK) | VARIANT_BITS;
  return formatUuidBytes(bytes);
}
function writeTimestamp(bytes: Uint8Array, epochMs: number): void {
  const timestamp = BigInt(epochMs);
  for (let index = 0; index < TIMESTAMP_BYTE_COUNT; index += 1) {
    const shift = BigInt((TIMESTAMP_BYTE_COUNT - 1 - index) * 8);
    bytes[index] = Number((timestamp >> shift) & BigInt(BYTE_MASK));
  }
}
function formatUuidBytes(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
