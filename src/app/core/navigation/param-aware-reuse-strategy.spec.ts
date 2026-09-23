import { convertToParamMap } from '@angular/router';
import type { ActivatedRouteSnapshot, Route } from '@angular/router';
import { expect, it } from 'vitest';
import { ParamAwareReuseStrategy } from './param-aware-reuse-strategy';

function snapshot(config: Route, params: Record<string, string>): ActivatedRouteSnapshot {
  return { routeConfig: config, paramMap: convertToParamMap(params) } as unknown as ActivatedRouteSnapshot;
}
const CONFIG: Route = { path: ':id' };
const strategy = new ParamAwareReuseStrategy();

it('TU — reaproveita a rota quando a configuração e os parâmetros são iguais', () => {
  expect(strategy.shouldReuseRoute(snapshot(CONFIG, { id: 'a' }), snapshot(CONFIG, { id: 'a' }))).toBe(true);
});

it('TU — recria a tela quando só o parâmetro muda, como ao abrir a cópia de um deck', () => {
  expect(strategy.shouldReuseRoute(snapshot(CONFIG, { id: 'b' }), snapshot(CONFIG, { id: 'a' }))).toBe(false);
});

it('TU — recria a tela quando a quantidade de parâmetros muda', () => {
  expect(strategy.shouldReuseRoute(snapshot(CONFIG, { id: 'a', x: '1' }), snapshot(CONFIG, { id: 'a' }))).toBe(false);
});

it('TU — não reaproveita rotas de configurações diferentes', () => {
  expect(strategy.shouldReuseRoute(snapshot({ path: 'x' }, {}), snapshot(CONFIG, {}))).toBe(false);
});
