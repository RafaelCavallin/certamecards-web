import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AdminApi } from '../../../core/api/admin-api';
import type { AdminUser } from '../../../core/api/admin.model';
import { AdminsPage } from './admins-page';

export function anAdmin(overrides: Partial<AdminUser> = {}): AdminUser {
  return { id: '1', email: 'ana@exemplo.com', displayName: 'Ana', ...overrides };
}
export interface AdminsPageHarness {
  readonly listAdmins: ReturnType<typeof vi.fn>;
  readonly grantAdmin: ReturnType<typeof vi.fn>;
  readonly revokeAdmin: ReturnType<typeof vi.fn>;
}
export function setupAdminsPage(admins: readonly AdminUser[]): AdminsPageHarness {
  const listAdmins = vi.fn().mockResolvedValue(admins);
  const grantAdmin = vi.fn();
  const revokeAdmin = vi.fn();
  TestBed.configureTestingModule({
    imports: [AdminsPage],
    providers: [provideRouter([]), { provide: AdminApi, useValue: { listAdmins, grantAdmin, revokeAdmin } }],
  });
  return { listAdmins, grantAdmin, revokeAdmin };
}
