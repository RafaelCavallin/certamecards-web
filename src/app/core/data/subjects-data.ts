import { Injectable, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import type { Subject } from '../api/subject.model';
import { LocalDb } from '../db/local-db';

@Injectable({ providedIn: 'root' })
export class SubjectsData {
  private readonly localDb = inject(LocalDb);

  readonly active: Signal<readonly Subject[]> = toSignal(from(liveQuery(() => this.fetchActive())), {
    initialValue: [],
  });
  readonly all: Signal<readonly Subject[]> = toSignal(from(liveQuery(() => this.localDb.subjects.toArray())), {
    initialValue: [],
  });

  private async fetchActive(): Promise<Subject[]> {
    const all = await this.localDb.subjects.toArray();
    return all.filter((subject) => subject.active).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }
}
