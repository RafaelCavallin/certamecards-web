import type { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

function queryOrThrow(fixture: ComponentFixture<unknown>, selector: string): HTMLElement {
  const element = fixture.debugElement.query(By.css(selector));
  if (element === null) {
    throw new Error(`elemento "${selector}" não encontrado`);
  }
  return element.nativeElement as HTMLElement;
}
export function setInputValue(fixture: ComponentFixture<unknown>, selector: string, value: string): void {
  const input = queryOrThrow(fixture, selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}
export function clickElement(fixture: ComponentFixture<unknown>, selector: string): void {
  queryOrThrow(fixture, selector).click();
}
export function submitForm(fixture: ComponentFixture<unknown>, selector = 'form'): void {
  const form = fixture.debugElement.query(By.css(selector));
  if (form === null) {
    throw new Error(`elemento "${selector}" não encontrado`);
  }
  form.triggerEventHandler('submit', new Event('submit'));
}
export function textContent(fixture: ComponentFixture<unknown>, selector: string): string | null {
  const element = fixture.debugElement.query(By.css(selector));
  return element === null ? null : (element.nativeElement as HTMLElement).textContent;
}
export function exists(fixture: ComponentFixture<unknown>, selector: string): boolean {
  return fixture.debugElement.query(By.css(selector)) !== null;
}
export function rootText(fixture: ComponentFixture<unknown>): string | null {
  return (fixture.debugElement.nativeElement as HTMLElement).textContent;
}
export function queryAll(fixture: ComponentFixture<unknown>, selector: string): readonly HTMLElement[] {
  return fixture.debugElement.queryAll(By.css(selector)).map((element) => element.nativeElement as HTMLElement);
}
export function queryElement(fixture: ComponentFixture<unknown>, selector: string): HTMLElement | null {
  const element = fixture.debugElement.query(By.css(selector));
  return element === null ? null : (element.nativeElement as HTMLElement);
}
const WAIT_FOR_POLL_INTERVAL_MS = 5;
const WAIT_FOR_TIMEOUT_MS = 1000;
export async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + WAIT_FOR_TIMEOUT_MS;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error('waitFor: condição não satisfeita a tempo');
    }
    await new Promise((resolve) => setTimeout(resolve, WAIT_FOR_POLL_INTERVAL_MS));
  }
}
