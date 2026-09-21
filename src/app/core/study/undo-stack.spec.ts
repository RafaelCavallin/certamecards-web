import { expect, it } from 'vitest';
import { UndoStack } from './undo-stack';

it('TU — canUndo é falso numa pilha vazia', () => {
  const stack = new UndoStack<number>(3);
  expect(stack.canUndo).toBe(false);
  expect(stack.pop()).toBeUndefined();
});

it('TU — push e pop respeitam a ordem LIFO', () => {
  const stack = new UndoStack<number>(3);
  stack.push(1);
  stack.push(2);
  expect(stack.canUndo).toBe(true);
  expect(stack.pop()).toBe(2);
  expect(stack.pop()).toBe(1);
  expect(stack.canUndo).toBe(false);
});

it('TU — respeita o limite de 30 passos, descartando o mais antigo', () => {
  const stack = new UndoStack<number>(2);
  stack.push(1);
  stack.push(2);
  stack.push(3);
  expect(stack.pop()).toBe(3);
  expect(stack.pop()).toBe(2);
  expect(stack.pop()).toBeUndefined();
});

it('TU — clear esvazia a pilha', () => {
  const stack = new UndoStack<number>(3);
  stack.push(1);
  stack.clear();
  expect(stack.canUndo).toBe(false);
});
