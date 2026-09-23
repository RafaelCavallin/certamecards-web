import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  CardErrorReport,
  CreateErrorReportRequest,
  ErrorReportFilter,
  ErrorReportOutcome,
  ErrorReportPage,
  ErrorReportReceipt,
} from './error-report.model';

const CARDS_BASE = `${environment.apiBaseUrl}/cards`;
const ADMIN_REPORTS_BASE = `${environment.apiBaseUrl}/admin/error-reports`;
@Injectable({ providedIn: 'root' })
export class ErrorReportsApi {
  private readonly http = inject(HttpClient);

  create(cardId: string, request: CreateErrorReportRequest): Promise<ErrorReportReceipt> {
    return firstValueFrom(this.http.post<ErrorReportReceipt>(`${CARDS_BASE}/${cardId}/error-reports`, request));
  }

  list(filter: ErrorReportFilter): Promise<ErrorReportPage> {
    const params = { status: filter.status, page: filter.page };
    return firstValueFrom(this.http.get<ErrorReportPage>(ADMIN_REPORTS_BASE, { params }));
  }

  close(id: string, outcome: ErrorReportOutcome): Promise<CardErrorReport> {
    return firstValueFrom(this.http.post<CardErrorReport>(`${ADMIN_REPORTS_BASE}/${id}/closure`, { outcome }));
  }
}
