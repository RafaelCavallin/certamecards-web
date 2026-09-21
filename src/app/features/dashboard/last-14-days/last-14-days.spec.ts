import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { rootText } from '../../../testing/dom-testing';
import { StatsService } from '../../../core/stats/stats-service';
import { Last14Days } from './last-14-days';

it('TU — mostra o título e os totais vindos do StatsService', () => {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: StatsService,
        useValue: {
          last14Days: () => ({
            days: [{ dateKey: '2026-09-17', reviews: 3 }],
            totalReviews: 3,
            accuracyPercent: 67,
            focusMinutes: 8,
          }),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(Last14Days);
  fixture.detectChanges();
  const text = rootText(fixture);
  expect(text).toContain('Últimos 14 dias');
  expect(text).toContain('67%');
});
