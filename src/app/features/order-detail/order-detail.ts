import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Order } from '../../core/models/order.models';
import { OrderService } from '../../core/services/order.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-order-detail',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);
  private readonly orderId = Number(this.route.snapshot.paramMap.get('id'));

  readonly order = signal<Order | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly canRetry = signal(true);

  constructor() {
    this.reload();
  }

  reload(): void {
    if (this.loading()) return;
    if (!Number.isInteger(this.orderId) || this.orderId <= 0) {
      this.loading.set(false);
      this.error.set('Pedido invalido.');
      this.canRetry.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.canRetry.set(true);
    this.orderService
      .getById(this.orderId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (order) => this.order.set(order),
        error: (response) => {
          this.canRetry.set(![401, 403, 404].includes(response.status));
          this.error.set(
            response.status === 404
              ? 'Pedido não encontrado ou indisponível para esta conta.'
              : apiErrorMessage(response, 'Não foi possível carregar o pedido.'),
          );
        },
      });
  }

  paymentMethodLabel(value: string): string {
    return (
      (
        { pix: 'Pix', credit_card: 'Cartão de crédito', debit_card: 'Cartão de débito' } as Record<
          string,
          string
        >
      )[value] ?? value
    );
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
