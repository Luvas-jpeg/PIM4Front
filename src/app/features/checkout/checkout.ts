import { FieldError } from '../../shared/validation/field-error';
import { addressValidators, digits } from '../../shared/validation/profile.validators';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { PromoCodeService } from '../../core/services/promo-code.service';
import { CreateOrderRequest } from '../../core/models/order.models';
import { PromoCode } from '../../core/models/promo-codes.models';
import { UpdateProfileRequest, User } from '../../core/models/auth.models';
import { apiErrorMessage } from '../../core/http/api-error';

type PaymentMethod = 'credit_card' | 'debit_card' | 'pix';

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink, FieldError],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly promoCodeService = inject(PromoCodeService);
  private readonly router = inject(Router);
  private pendingAttempt?: { payload: string; key: string };
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  readonly user = this.authService.user;
  readonly items = this.cartService.items;
  readonly subtotal = this.cartService.total;
  readonly count = this.cartService.count;
  readonly promoCode = signal<PromoCode | null>(null);
  readonly promoMessage = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly validatingCoupon = signal(false);
  readonly savingAddress = signal(false);
  readonly addressModalOpen = signal(false);

  readonly hasUnassignedCourse = computed(() =>
    this.items().some((item) => item.course.deliveryMode !== 'ead' && !item.courseClass),
  );

  readonly shipping = computed(() => 0);

  readonly discount = computed(() => {
    const coupon = this.promoCode();

    if (!coupon) {
      return 0;
    }

    if (coupon.discountType === 'percentage') {
      return Math.min(this.subtotal() * (coupon.discount / 100), this.subtotal());
    }

    return Math.min(coupon.discount, this.subtotal());
  });

  readonly total = computed(() => Math.max(this.subtotal() + this.shipping() - this.discount(), 0));

  readonly form = this.formBuilder.group({
    paymentMethod: this.formBuilder.control<PaymentMethod>('pix', {
      validators: [Validators.required],
    }),
    installments: this.formBuilder.control(1, {
      validators: [Validators.required, Validators.min(1), Validators.max(12)],
    }),
    promoCode: this.formBuilder.control(''),
  });

  readonly addressForm = this.formBuilder.group({
    street: this.formBuilder.control('', addressValidators.street),
    number: this.formBuilder.control('', addressValidators.number),
    complement: this.formBuilder.control('', addressValidators.complement),
    neighborhood: this.formBuilder.control('', addressValidators.neighborhood),
    city: this.formBuilder.control('', addressValidators.city),
    state: this.formBuilder.control('', addressValidators.state),
    zipCode: this.formBuilder.control('', addressValidators.zipCode),
  });

  readonly paymentMethod = this.form.controls.paymentMethod;

  constructor() {
    this.fillAddressForm();
  }

  formatPrice(value: number): string {
    return this.currencyFormatter.format(value);
  }

  applyCoupon(): void {
    if (this.submitting() || this.validatingCoupon()) return;
    const code = this.form.controls.promoCode.value.trim().toUpperCase();

    this.error.set(null);
    this.success.set(null);
    this.promoMessage.set(null);
    this.promoCode.set(null);

    if (!code) {
      this.promoMessage.set('Informe um cupom para aplicar.');
      return;
    }

    this.validatingCoupon.set(true);

    this.promoCodeService
      .validate(code)
      .pipe(finalize(() => this.validatingCoupon.set(false)))
      .subscribe({
        next: (coupon) => {
          this.promoCode.set(coupon);
          this.form.controls.promoCode.setValue(coupon.code);
          this.promoMessage.set(`Cupom ${coupon.code} aplicado.`);
        },
        error: (response) => {
          this.promoMessage.set(apiErrorMessage(response, 'Cupom inválido ou indisponível.'));
        },
      });
  }

  removeCoupon(): void {
    if (this.submitting()) return;
    this.promoCode.set(null);
    this.promoMessage.set(null);
    this.form.controls.promoCode.setValue('');
  }

  openAddressModal(): void {
    this.fillAddressForm();
    this.addressModalOpen.set(true);
  }

  closeAddressModal(): void {
    this.addressModalOpen.set(false);
  }

  saveAddress(): void {
    if (this.savingAddress()) return;
    this.error.set(null);

    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      this.error.set('Revise os campos do endereço.');
      return;
    }

    const user = this.user();

    if (!user) {
      this.error.set('Usuario nao encontrado.');
      return;
    }

    const address = this.addressForm.getRawValue();
    const request: UpdateProfileRequest = {
      nome: user.nome,
      email: user.email,
      cpf: user.cpf,
      phone: user.phone,
      street: address.street.trim(),
      number: address.number.trim(),
      complement: address.complement.trim(),
      neighborhood: address.neighborhood.trim(),
      city: address.city.trim(),
      state: address.state.trim().toUpperCase(),
      zipCode: digits(address.zipCode),
    };

    this.savingAddress.set(true);

    this.authService
      .updateProfile(request)
      .pipe(finalize(() => this.savingAddress.set(false)))
      .subscribe({
        next: () => {
          this.addressModalOpen.set(false);
          this.success.set('Endereço atualizado.');
        },
        error: (response) =>
          this.error.set(apiErrorMessage(response, 'Não foi possível salvar o endereço.')),
      });
  }

  submit(): void {
    if (this.submitting()) return;
    this.error.set(null);
    this.success.set(null);

    if (this.items().length === 0) {
      this.error.set('Adicione itens ao carrinho antes de finalizar.');
      return;
    }

    if (this.hasUnassignedCourse()) {
      this.error.set('Selecione uma turma para cada curso presencial antes de finalizar.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revise os dados de pagamento.');
      return;
    }
    if (this.validatingCoupon()) {
      this.error.set('Aguarde a validação do cupom antes de criar o pedido.');
      return;
    }

    const paymentMethod = this.form.controls.paymentMethod.value;
    const installments =
      paymentMethod === 'credit_card' ? this.form.controls.installments.value : null;

    const request: CreateOrderRequest = {
      itens: this.items().map((item) => ({
        courseId: item.course.id,
        turmaId: item.courseClass?.id ?? null,
        quantidade: item.quantity,
      })),
      valorFrete: 0,
      paymentMethod,
      installments,
      promoCode: this.promoCode()?.code ?? '',
    };

    // A lost response may mean the server already created the order. Reuse the
    // key only for this account and the exact same request on a manual retry.
    const payload = JSON.stringify({ userId: this.user()?.id, request });
    if (this.pendingAttempt?.payload !== payload) {
      this.pendingAttempt = { payload, key: crypto.randomUUID() };
    }

    this.submitting.set(true);

    this.orderService
      .create(request, this.pendingAttempt.key)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response) => {
          this.pendingAttempt = undefined;
          this.cartService.clear();
          this.success.set(`${response.message} Pedido #${response.orderId}.`);
          void this.router.navigate(['/conta/pedido', response.orderId]);
        },
        error: (response) => {
          const message = apiErrorMessage(response, 'Não foi possível criar o pedido.');
          this.error.set(
            response.status === 0 || response.status >= 500
              ? `${message} Confira “Meus pedidos” antes de tentar novamente; o pedido pode ter sido registrado.`
              : message,
          );
        },
      });
  }

  private fillAddressForm(): void {
    const user = this.user();

    if (!user) {
      return;
    }

    this.addressForm.setValue({
      street: user.street ?? '',
      number: user.number ?? '',
      complement: user.complement ?? '',
      neighborhood: user.neighborhood ?? '',
      city: user.city ?? '',
      state: user.state ?? '',
      zipCode: user.zipCode ?? '',
    });
  }
}
