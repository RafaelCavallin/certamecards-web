import type { EventOrder } from '../sync/event-order.model';
import type { ReviewLogRow } from '../db/account-db.model';

export function compareEventOrder(a: EventOrder, b: EventOrder): number {
  if (a.eventAt !== b.eventAt) {
    return a.eventAt < b.eventAt ? -1 : 1;
  }
  if (a.logicalCounter !== b.logicalCounter) {
    return a.logicalCounter - b.logicalCounter;
  }
  if (a.deviceId !== b.deviceId) {
    return a.deviceId < b.deviceId ? -1 : 1;
  }
  if (a.operationId !== b.operationId) {
    return a.operationId < b.operationId ? -1 : 1;
  }
  return 0;
}
export function eventOrderOf(log: ReviewLogRow): EventOrder {
  return { eventAt: log.eventAt, logicalCounter: log.eventCounter, deviceId: log.eventDeviceId, operationId: log.operationId };
}
export function compareReviewLogs(a: ReviewLogRow, b: ReviewLogRow): number {
  return compareEventOrder(eventOrderOf(a), eventOrderOf(b));
}
