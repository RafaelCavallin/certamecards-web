import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AuditLogFilter, AuditLogPage } from './audit-log.model';
import { toQueryParams } from './query-params';

const AUDIT_LOGS_URL = `${environment.apiBaseUrl}/admin/audit-logs`;
@Injectable({ providedIn: 'root' })
export class AuditLogApi {
  private readonly http = inject(HttpClient);

  list(filter: AuditLogFilter): Promise<AuditLogPage> {
    const params = toQueryParams({ ...filter });
    return firstValueFrom(this.http.get<AuditLogPage>(AUDIT_LOGS_URL, { params }));
  }
}
