import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  AdminSubject,
  AdminUser,
  CreateSubjectRequest,
  GrantAdminRequest,
  UpdateSubjectRequest,
} from './admin.model';

const ADMIN_BASE = `${environment.apiBaseUrl}/admin`;
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);

  listSubjects(): Promise<readonly AdminSubject[]> {
    return firstValueFrom(this.http.get<readonly AdminSubject[]>(`${ADMIN_BASE}/subjects`));
  }

  createSubject(request: CreateSubjectRequest): Promise<AdminSubject> {
    return firstValueFrom(this.http.post<AdminSubject>(`${ADMIN_BASE}/subjects`, request));
  }

  updateSubject(id: string, request: UpdateSubjectRequest): Promise<AdminSubject> {
    return firstValueFrom(this.http.patch<AdminSubject>(`${ADMIN_BASE}/subjects/${id}`, request));
  }

  listAdmins(): Promise<readonly AdminUser[]> {
    return firstValueFrom(this.http.get<readonly AdminUser[]>(`${ADMIN_BASE}/admins`));
  }

  grantAdmin(request: GrantAdminRequest): Promise<AdminUser> {
    return firstValueFrom(this.http.post<AdminUser>(`${ADMIN_BASE}/admins`, request));
  }

  revokeAdmin(userId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${ADMIN_BASE}/admins/${userId}`));
  }
}
