import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { PaymentWebhookEvent } from '../../../../core/models/payment.models';
import { Order } from '../../../../core/models/order.models';
import { OrderService } from '../../../../core/services/order.service';
import { PaymentService } from '../../../../core/services/payment.service';
import { AdminNotification } from '../../admin.types';

@Component({
  selector: 'app-admin-orders',
  templateUrl: './admin-orders.html',
})
export class AdminOrders {
  private readonly orderService = inject(OrderService);
  private readonly paymentService = inject(PaymentService);
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  private readonly ordersSignal = signal<Order[]>([]);

  @Input()
  set orders(value: Order[]) {
    this.ordersSignal.set(value);
  }

  @Output() ordersChange = new EventEmitter<Order[]>();
  @Output() notify = new EventEmitter<AdminNotification>();

  readonly orderSearch = signal('');
  readonly orderStatusFilter = signal('all');
  readonly paymentStatusFilter = signal('all');
  readonly selectedOrder = signal<Order | null>(null);
  readonly webhookEvents = signal<PaymentWebhookEvent[]>([]);
  readonly loadingWebhookEvents = signal(false);

  readonly filteredOrders = computed(() => {
    const search = this.orderSearch().trim().toLowerCase();
    const status = this.orderStatusFilter();
    const paymentStatus = this.paymentStatusFilter();

    return this.ordersSignal().filter(order => {
      const matchesSearch = !search
        || String(order.id).includes(search)
        || order.usuario?.nome?.toLowerCase().includes(search)
        || order.usuario?.email?.toLowerCase().includes(search)
        || order.itens.some(item => item.nome.toLowerCase().includes(search));
      const matchesStatus = status === 'all' || order.status === status;
      const matchesPayment = paymentStatus === 'all' || order.paymentStatus === paymentStatus;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  });

  setOrderSearch(value: string): void {
    this.orderSearch.set(value);
  }

  setOrderStatusFilter(value: string): void {
    this.orderStatusFilter.set(value);
  }

  setPaymentStatusFilter(value: string): void {
    this.paymentStatusFilter.set(value);
  }

  formatPrice(value: number): string {
    return this.currencyFormatter.format(value);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Nao informado';

    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  paymentMethodLabel(value: string): string {
    const labels: Record<string, string> = {
      pix: 'Pix',
      credit_card: 'Cartao de credito',
      debit_card: 'Cartao de debito',
    };

    return labels[value] ?? (value || 'Nao informado');
  }

  orderStatusLabel(value: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      processing: 'Processando',
      completed: 'Concluido',
      cancelled: 'Cancelado',
    };

    return labels[value] ?? value;
  }

  paymentStatusLabel(value: string | undefined): string {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      paid: 'Pago',
      refused: 'Recusado',
      cancelled: 'Cancelado',
      refunded: 'Reembolsado',
    };

    return labels[value ?? ''] ?? 'Nao informado';
  }

  updateOrderStatus(order: Order, status: string): void {
    this.orderService.updateStatus(order.id, status).subscribe({
      next: response => {
        this.ordersChange.emit(this.ordersSignal().map(current =>
          current.id === order.id ? { ...current, status: response.status } : current
        ));
        this.notify.emit({ type: 'success', message: 'Status do pedido atualizado.' });
      },
      error: () => this.notify.emit({ type: 'error', message: 'Nao foi possivel atualizar o pedido.' }),
    });
  }

  refundOrder(order: Order): void {
    this.orderService.refund(order.id).subscribe({
      next: refundedOrder => {
        this.ordersChange.emit(this.ordersSignal().map(current =>
          current.id === order.id ? refundedOrder : current
        ));
        this.notify.emit({ type: 'success', message: 'Reembolso processado e matriculas canceladas.' });
      },
      error: () => this.notify.emit({ type: 'error', message: 'Nao foi possivel processar o reembolso.' }),
    });
  }

  exportOrdersCsv(): void {
    const rows = [
      ['Pedido', 'Data', 'Cliente', 'E-mail', 'Status pedido', 'Status pagamento', 'Metodo', 'Gateway', 'Total'],
      ...this.filteredOrders().map(order => [
        order.id,
        this.formatDate(order.dataPedido),
        order.usuario?.nome || 'Cliente',
        order.usuario?.email || '',
        this.orderStatusLabel(order.status),
        this.paymentStatusLabel(order.paymentStatus),
        this.paymentMethodLabel(order.paymentMethod),
        order.gatewayPaymentId || '',
        this.formatPrice(order.total),
      ]),
    ];
    const csv = rows
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  openDetails(order: Order): void {
    this.selectedOrder.set(order);
    this.loadWebhookEvents(order.id);
  }

  closeDetails(): void {
    this.selectedOrder.set(null);
    this.webhookEvents.set([]);
  }

  itemTotal(orderItem: Order['itens'][number]): number {
    return orderItem.quantidade * orderItem.precoUnitario;
  }

  private loadWebhookEvents(orderId: number): void {
    this.loadingWebhookEvents.set(true);
    this.webhookEvents.set([]);

    this.paymentService.getWebhookEvents(orderId).subscribe({
      next: events => this.webhookEvents.set(events),
      error: () => this.notify.emit({
        type: 'error',
        message: 'Nao foi possivel carregar os eventos de pagamento.',
      }),
      complete: () => this.loadingWebhookEvents.set(false),
    });
  }
}
