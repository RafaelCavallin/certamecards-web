import type { HttpRequest } from '@angular/common/http';
import type { HttpTestingController, TestRequest } from '@angular/common/http/testing';

const POLL_INTERVAL_MS = 5;
const MAX_POLLS = 400;
type RequestPredicate = (request: HttpRequest<unknown>) => boolean;
export async function expectOneEventually(
  httpMock: HttpTestingController,
  match: string | RequestPredicate,
): Promise<TestRequest> {
  const predicate: RequestPredicate = typeof match === 'string' ? (request) => request.url === match : match;
  for (let poll = 0; poll < MAX_POLLS; poll++) {
    const found = httpMock.match(predicate);
    if (found.length > 1) {
      throw new Error(`Esperava uma requisição, encontrou ${found.length}.`);
    }
    const [request] = found;
    if (request !== undefined) {
      return request;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return httpMock.expectOne(predicate);
}
