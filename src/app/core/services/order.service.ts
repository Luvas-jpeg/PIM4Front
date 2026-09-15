import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateOrderRequest, CreateOrderResponse, Order } from '../models/order.models';
import { API_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  create(request: CreateOrderRequest, idempotencyKey: string): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(`${API_URL}/Orders`, request, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  getMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${API_URL}/Orders/my`);
  }

  getById(id: number): Observable<Order> {
    return this.http.get<Order>(`${API_URL}/Orders/${id}`);
  }

  getAll(): Observable<Order[]> {
    return this.http.get<Order[]>(`${API_URL}/Orders`);
  }

  cancel(id: number): Observable<Order> {
    return this.http.post<Order>(`${API_URL}/Orders/${id}/cancel`, {});
  }

  updateStatus(id: number, status: string): Observable<{ id: number; status: string }> {
    return this.http.put<{ id: number; status: string }>(
      `${API_URL}/Orders/${id}/status`,
      { status }
    );
  }

  refund(id: number): Observable<Order> {
    return this.http.post<Order>(`${API_URL}/Orders/${id}/refund`, {});
  }
}