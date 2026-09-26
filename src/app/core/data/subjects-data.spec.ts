import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { SubjectsData } from './subjects-data';

let db: AccountDb;

function setup(): SubjectsData {
  TestBed.configureTestingModule({});
  db = new AccountDb('subjects-data-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'subjects-data-test' });
  return TestBed.inject(SubjectsData);
}

afterEach(async () => {
  await db.delete();
});

it('TU — active devolve só as matérias ativas, ordenadas por nome', async () => {
  const subjectsData = setup();
  await db.subjects.bulkAdd([
    { id: '1', name: 'Português', active: true, changeSeq: 1 },
    { id: '2', name: 'Direito Penal', active: true, changeSeq: 2 },
    { id: '3', name: 'Matéria desativada', active: false, changeSeq: 3 },
  ]);
  await waitFor(() => subjectsData.active().length > 0);
  expect(subjectsData.active().map((subject) => subject.name)).toEqual(['Direito Penal', 'Português']);
});

it('TU — all devolve também as matérias desativadas', async () => {
  const subjectsData = setup();
  await db.subjects.bulkAdd([{ id: '3', name: 'Matéria desativada', active: false, changeSeq: 3 }]);
  await waitFor(() => subjectsData.all().length > 0);
  expect(subjectsData.all().map((subject) => subject.id)).toEqual(['3']);
});
