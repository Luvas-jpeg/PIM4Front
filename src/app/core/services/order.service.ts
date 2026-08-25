import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateOrderRequest, CreateOrderResponse, Order } from '../models/order.models';

const API_URL = 'http://localhost:5278/api';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  create(request: CreateOrderRequest): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(`${API_URL}/Orders`, request);
  }

  getMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${API_URL}/Orders/my`);
  }

  getAll(): Observable<Order[]> {
    return this.http.get<Order[]>(`${API_URL}/Orders`);
  }

  updateStatus(id: number, status: string): Observable<{ id: number; status: string }> {
    return this.http.put<{ id: number; status: string }>(
      `${API_URL}/Orders/${id}/status`,
      { status }
    );
  }
}