import { BaseRouteReuseStrategy } from '@angular/router';
import type { ActivatedRouteSnapshot } from '@angular/router';

export class ParamAwareReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
    return super.shouldReuseRoute(future, current) && sameParams(future, current);
  }
}
function sameParams(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
  const futureKeys = future.paramMap.keys;
  return (
    futureKeys.length === current.paramMap.keys.length &&
    futureKeys.every((key) => future.paramMap.get(key) === current.paramMap.get(key))
  );
}
