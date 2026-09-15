import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Order } from '../../core/models/order.models';
import { OrderService } from '../../core/services/order.service';

@Component({
  selector: 'app-order-detail',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  readonly order = signal<Order | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    const orderId = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(orderId) || orderId <= 0) {
      this.loading.set(false);
      this.error.set('Pedido invalido.');
      return;
    }

    this.orderService.getById(orderId).subscribe({
      next: order => this.order.set(order),
      error: response => {
        this.error.set(response.error?.message ?? 'Nao foi possivel carregar o pedido.');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(value));
  }

  statusLabel(value: string | undefined): string {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      processing: 'Processando',
      completed: 'Concluido',
      cancelled: 'Cancelado',
      paid: 'Pago',
      refused: 'Recusado',
      refunded: 'Reembolsado',
    };

    return labels[value ?? ''] ?? value ?? 'Nao informado';
  }
}
