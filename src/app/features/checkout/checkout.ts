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

type PaymentMethod = 'credit' | 'debit' | 'pix';

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink],
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

  readonly hasEquipment = computed(() =>
    this.items().some(item => item.product.tipoProduto === 'equipment')
  );

  readonly hasAddress = computed(() => this.isAddressComplete(this.user()));

  readonly shipping = computed(() => {
    if (!this.hasEquipment()) {
      return 0;
    }

    if (this.subtotal() >= 500) {
      return 0;
    }

    return this.calculateShipping(this.user());
  });

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

  readonly total = computed(() =>
    Math.max(this.subtotal() + this.shipping() - this.discount(), 0)
  );

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
    street: this.formBuilder.control('', [Validators.required]),
    number: this.formBuilder.control('', [Validators.required]),
    complement: this.formBuilder.control(''),
    neighborhood: this.formBuilder.control('', [Validators.required]),
    city: this.formBuilder.control('', [Validators.required]),
    state: this.formBuilder.control('', [Validators.required, Validators.minLength(2)]),
    zipCode: this.formBuilder.control('', [Validators.required, Validators.minLength(8)]),
  });

  readonly paymentMethod = this.form.controls.paymentMethod;

  constructor() {
    this.fillAddressForm();
  }

  formatPrice(value: number): string {
    return this.currencyFormatter.format(value);
  }

  applyCoupon(): void {
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

    this.promoCodeService.validate(code)
      .pipe(finalize(() => this.validatingCoupon.set(false)))
      .subscribe({
        next: (coupon) => {
          this.promoCode.set(coupon);
          this.form.controls.promoCode.setValue(coupon.code);
          this.promoMessage.set(`Cupom ${coupon.code} aplicado.`);
        },
        error: () => {
          this.promoMessage.set('Cupom invalido ou indisponivel.');
        },
      });
  }

  removeCoupon(): void {
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
    this.error.set(null);

    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      this.error.set('Preencha o endereco para calcular o frete.');
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
      zipCode: address.zipCode.replace(/\D/g, ''),
    };

    this.savingAddress.set(true);

    this.authService.updateProfile(request)
      .pipe(finalize(() => this.savingAddress.set(false)))
      .subscribe({
        next: () => {
          this.addressModalOpen.set(false);
          this.success.set('Endereco atualizado. Frete recalculado.');
        },
        error: response => this.error.set(response.error?.message ?? 'Nao foi possivel salvar o endereco.'),
      });
  }

  submit(): void {
    this.error.set(null);
    this.success.set(null);

    if (this.items().length === 0) {
      this.error.set('Adicione itens ao carrinho antes de finalizar.');
      return;
    }

    if (this.hasEquipment() && !this.hasAddress()) {
      this.openAddressModal();
      this.error.set('Cadastre o endereco para calcular o frete.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revise os dados de pagamento.');
      return;
    }

    const paymentMethod = this.form.controls.paymentMethod.value;
    const installments = paymentMethod === 'credit'
      ? this.form.controls.installments.value
      : null;

    const request: CreateOrderRequest = {
      itens: this.items().map(item => ({
        produtoId: item.product.id,
        quantidade: item.quantity,
      })),
      valorFrete: this.shipping(),
      paymentMethod,
      installments,
      promoCode: this.promoCode()?.code ?? '',
    };

    this.submitting.set(true);

    this.orderService.create(request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response) => {
          this.cartService.clear();
          this.success.set(`${response.message} Pedido #${response.orderId}.`);
          void this.router.navigate(['/']);
        },
        error: (response) => {
          this.error.set(response.error?.message ?? 'Nao foi possivel criar o pedido.');
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

  private isAddressComplete(user: User | null): boolean {
    if (!user) {
      return false;
    }

    return [
      user.street,
      user.number,
      user.neighborhood,
      user.city,
      user.state,
      user.zipCode,
    ].every(value => !!value?.trim());
  }

  private calculateShipping(user: User | null): number {
    const state = user?.state?.trim().toUpperCase();
    const equipmentQuantity = this.items()
      .filter(item => item.product.tipoProduto === 'equipment')
      .reduce((sum, item) => sum + item.quantity, 0);
    const extraVolume = Math.max(equipmentQuantity - 1, 0) * 6;

    if (!state) {
      return 0;
    }

    if (state === 'SP') {
      return 19.9 + extraVolume;
    }

    if (['RJ', 'MG', 'ES'].includes(state)) {
      return 29.9 + extraVolume;
    }

    if (['PR', 'SC', 'RS'].includes(state)) {
      return 34.9 + extraVolume;
    }

    return 44.9 + extraVolume;
  }
}
