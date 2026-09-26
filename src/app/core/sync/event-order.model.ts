export interface HybridClockState {
  readonly wallTime: string;
  readonly logicalCounter: number;
}
export interface EventOrder {
  readonly eventAt: string;
  readonly logicalCounter: number;
  readonly deviceId: string;
  readonly operationId: string;
}
export interface ServerAnchor {
  readonly serverTime: string;
}
export function isHybridClockState(value: unknown): value is HybridClockState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'wallTime' in value &&
    'logicalCounter' in value &&
    typeof value.wallTime === 'string' &&
    typeof value.logicalCounter === 'number'
  );
}
