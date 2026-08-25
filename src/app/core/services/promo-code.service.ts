import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PromoCode, PromoCodeRequest } from '../models/promo-codes.models';

const API_URL = 'http://localhost:5278/api';


@Injectable({ providedIn: 'root' })
export class PromoCodeService {
  private readonly http = inject(HttpClient)

  getAll(): Observable<PromoCode[]> {
    return this.http.get<PromoCode[]>(`${API_URL}/PromoCodes`);
  }

  create(request: PromoCodeRequest): Observable<PromoCode> {
    return this.http.post<PromoCode>(`${API_URL}/PromoCodes`, request);
  }

  update(id: number, request: PromoCodeRequest): Observable<PromoCode> {
    return this.http.put<PromoCode>(`${API_URL}/PromoCodes/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/PromoCodes/${id}`);
  }

  validate(code: string): Observable<PromoCode> {
    return this.http.get<PromoCode>(
      `${API_URL}/PromoCodes/validate?code=${encodeURIComponent(code)}`
    );
  }
}
