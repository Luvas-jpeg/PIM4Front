import { apiErrorMessage } from '../../core/http/api-error';
import { FieldError } from '../../shared/validation/field-error';
import {
  personalValidators,
  addressValidators,
  digits,
  normalizePhone,
} from '../../shared/validation/profile.validators';
import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { UpdateProfileRequest } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { Order } from '../../core/models/order.models';
import { OrderService } from '../../core/services/order.service';

@Component({
  selector: 'app-account',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, FieldError],
  templateUrl: './account.html',
  styleUrl: './account.scss',
})
export class Account {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);

  readonly user = this.authService.user;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly orders = signal<Order[]>([]);
  readonly loadingOrders = signal(false);
  readonly ordersError = signal<string | null>(null);
  readonly cancellingOrderId = signal<number | null>(null);
  readonly form = this.formBuilder.group({
    nome: this.formBuilder.control('', personalValidators.nome),
    email: this.formBuilder.control('', personalValidators.email),
    cpf: this.formBuilder.control('', personalValidators.cpf),
    phone: this.formBuilder.control('', personalValidators.phone),
    street: this.formBuilder.control('', addressValidators.street),
    number: this.formBuilder.control('', addressValidators.number),
    complement: this.formBuilder.control('', addressValidators.complement),
    neighborhood: this.formBuilder.control('', addressValidators.neighborhood),
    city: this.formBuilder.control('', addressValidators.city),
    state: this.formBuilder.control('', addressValidators.state),
    zipCode: this.formBuilder.control('', addressValidators.zipCode),
  });

  constructor() {
    this.fillForm();
    this.loadOrders();
  }

  formatOrderDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(value));
  }

  cancelOrder(order: Order): void {
    this.error.set(null);
    this.cancellingOrderId.set(order.id);

    this.orderService
      .cancel(order.id)
      .pipe(finalize(() => this.cancellingOrderId.set(null)))
      .subscribe({
        next: (cancelledOrder) => {
          this.orders.update((orders) =>
            orders.map((current) => (current.id === order.id ? cancelledOrder : current)),
          );
          this.success.set(`Pedido #${order.id} cancelado.`);
        },
        error: (response) =>
          this.error.set(apiErrorMessage(response, 'Não foi possível cancelar o pedido.')),
      });
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

  loadOrders(): void {
    if (this.loadingOrders()) return;
    this.ordersError.set(null);
    this.loadingOrders.set(true);
    this.orderService
      .getMyOrders()
      .pipe(finalize(() => this.loadingOrders.set(false)))
      .subscribe({
        next: (orders) => this.orders.set(orders),
        error: (response) =>
          this.ordersError.set(
            apiErrorMessage(response, 'Não foi possível carregar seu histórico de pedidos.'),
          ),
      });
  }

  save(): void {
    if (this.saving()) return;
    this.error.set(null);
    this.success.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revise seus dados e endereco.');
      return;
    }

    this.saving.set(true);

    this.authService
      .updateProfile(this.normalizeRequest())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => this.success.set('Dados atualizados com sucesso.'),
        error: (response) =>
          this.error.set(apiErrorMessage(response, 'Não foi possível atualizar sua conta.')),
      });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/']);
  }

  private fillForm(): void {
    const user = this.user();

    if (!user) {
      return;
    }

    this.form.setValue({
      nome: user.nome ?? '',
      email: user.email ?? '',
      cpf: user.cpf ?? '',
      phone: user.phone ?? '',
      street: user.street ?? '',
      number: user.number ?? '',
      complement: user.complement ?? '',
      neighborhood: user.neighborhood ?? '',
      city: user.city ?? '',
      state: user.state ?? '',
      zipCode: user.zipCode ?? '',
    });
  }

  private normalizeRequest(): UpdateProfileRequest {
    const raw = this.form.getRawValue();

    return {
      ...raw,
      nome: raw.nome.trim(),
      email: raw.email.trim().toLowerCase(),
      cpf: digits(raw.cpf),
      phone: normalizePhone(raw.phone),
      street: raw.street.trim(),
      number: raw.number.trim(),
      complement: raw.complement.trim(),
      neighborhood: raw.neighborhood.trim(),
      city: raw.city.trim(),
      state: raw.state.trim().toUpperCase(),
      zipCode: digits(raw.zipCode),
    };
  }
}
