import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { PaymentWebhookEvent } from '../models/payment.models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  getWebhookEvents(orderId: number): Observable<PaymentWebhookEvent[]> {
    return this.http.get<PaymentWebhookEvent[]>(`${API_URL}/payments/webhook-events`, {
      params: { orderId },
    });
  }
}
