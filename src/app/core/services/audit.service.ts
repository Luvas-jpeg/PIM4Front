import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { AuditLog } from '../models/audit.models';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);

  getAll(limit = 100): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${API_URL}/audit`, {
      params: { limit: limit.toString() },
    });
  }
}
