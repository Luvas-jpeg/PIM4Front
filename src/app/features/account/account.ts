import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { UpdateProfileRequest } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { EnrollmentService } from '../../core/services/enrollment.service';
import { MyEnrollment } from '../../core/models/enrollment.models';
import { Order } from '../../core/models/order.models';
import { OrderService } from '../../core/services/order.service';

@Component({
  selector: 'app-account',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './account.html',
  styleUrl: './account.scss',
})
export class Account {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly orderService = inject(OrderService);

  readonly user = this.authService.user;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly enrollments = signal<MyEnrollment[]>([]);
  readonly loadingEnrollments = signal(true);
  readonly orders = signal<Order[]>([]);
  readonly loadingOrders = signal(true);
  readonly cancellingOrderId = signal<number | null>(null);
  readonly activeEnrollmentCount = computed(() =>
    this.enrollments().filter(enrollment => enrollment.enrollmentStatus === 'active').length
  );
  readonly completedEnrollmentCount = computed(() =>
    this.enrollments().filter(enrollment => enrollment.enrollmentStatus === 'completed').length
  );
  readonly cancelledEnrollmentCount = computed(() =>
    this.enrollments().filter(enrollment => enrollment.enrollmentStatus === 'cancelled').length
  );
  readonly pendingOrderCount = computed(() =>
    this.orders().filter(order => order.paymentStatus === 'pending' && order.status === 'pending').length
  );

  readonly form = this.formBuilder.group({
    nome: this.formBuilder.control('', [Validators.required]),
    email: this.formBuilder.control('', [Validators.required, Validators.email]),
    cpf: this.formBuilder.control('', [Validators.required, Validators.minLength(11)]),
    phone: this.formBuilder.control('', [Validators.required]),
    street: this.formBuilder.control('', [Validators.required]),
    number: this.formBuilder.control('', [Validators.required]),
    complement: this.formBuilder.control(''),
    neighborhood: this.formBuilder.control('', [Validators.required]),
    city: this.formBuilder.control('', [Validators.required]),
    state: this.formBuilder.control('', [Validators.required, Validators.minLength(2)]),
    zipCode: this.formBuilder.control('', [Validators.required, Validators.minLength(8)]),
  });

  constructor() {
    this.fillForm();
    this.loadEnrollments();
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

    this.orderService.cancel(order.id)
      .pipe(finalize(() => this.cancellingOrderId.set(null)))
      .subscribe({
        next: cancelledOrder => {
          this.orders.update(orders => orders.map(current =>
            current.id === order.id ? cancelledOrder : current
          ));
          this.success.set(`Pedido #${order.id} cancelado.`);
        },
        error: response => this.error.set(
          response.error?.message ?? 'Nao foi possivel cancelar o pedido.'
        ),
      });
  }

  formatClassDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(value));
  }

  enrollmentStatusLabel(value: string): string {
    const labels: Record<string, string> = {
      active: 'Ativa',
      completed: 'Concluida',
      cancelled: 'Cancelada',
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

  private loadEnrollments(): void {
    this.enrollmentService.getMine().subscribe({
      next: enrollments => this.enrollments.set(enrollments),
      error: () => this.error.set('Nao foi possivel carregar suas matriculas.'),
      complete: () => this.loadingEnrollments.set(false),
    });
  }

  private loadOrders(): void {
    this.orderService.getMyOrders().subscribe({
      next: orders => this.orders.set(orders),
      error: () => this.error.set('Nao foi possivel carregar seu historico de pedidos.'),
      complete: () => this.loadingOrders.set(false),
    });
  }

  save(): void {
    this.error.set(null);
    this.success.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revise seus dados e endereco.');
      return;
    }

    this.saving.set(true);

    this.authService.updateProfile(this.normalizeRequest())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => this.success.set('Dados atualizados com sucesso.'),
        error: response => this.error.set(response.error?.message ?? 'Nao foi possivel atualizar sua conta.'),
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
      cpf: raw.cpf.replace(/\D/g, ''),
      state: raw.state.trim().toUpperCase(),
      zipCode: raw.zipCode.replace(/\D/g, ''),
    };
  }
}
