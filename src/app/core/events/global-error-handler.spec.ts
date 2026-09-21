import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { expect, it, vi } from 'vitest';
import { GlobalErrorHandler } from './global-error-handler';
import { EventsService } from './events-service';

function setup(record: ReturnType<typeof vi.fn>): GlobalErrorHandler {
  TestBed.configureTestingModule({
    providers: [
      GlobalErrorHandler,
      { provide: EventsService, useValue: { record } },
      { provide: Router, useValue: { url: '/estudar' } },
    ],
  });
  return TestBed.inject(GlobalErrorHandler);
}

it('TU — handleError registra client_error com a mensagem e a rota atual', () => {
  const record = vi.fn().mockResolvedValue(undefined);
  const handler = setup(record);
  handler.handleError(new Error('falha inesperada'));
  expect(record).toHaveBeenCalledWith(
    'client_error',
    expect.objectContaining({ message: 'falha inesperada', route: '/estudar' }),
  );
});

it('TU — handleError converte um erro não padrão em texto', () => {
  const record = vi.fn().mockResolvedValue(undefined);
  const handler = setup(record);
  handler.handleError('string solta');
  expect(record).toHaveBeenCalledWith('client_error', expect.objectContaining({ message: 'string solta' }));
});
