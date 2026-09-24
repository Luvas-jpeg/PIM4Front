import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { PromoCode, PromoCodeRequest } from '../../../../core/models/promo-codes.models';
import { PromoCodeService } from '../../../../core/services/promo-code.service';
import { AdminNotification } from '../../admin.types';

type DiscountType = 'percentage' | 'fixed';

@Component({
  selector: 'app-admin-coupons',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-coupons.html',
})
export class AdminCoupons {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly promoCodeService = inject(PromoCodeService);
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  @Input() promoCodes: PromoCode[] = [];
  @Output() promoCodesChange = new EventEmitter<PromoCode[]>();
  @Output() notify = new EventEmitter<AdminNotification>();

  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly editingCouponId = signal<number | null>(null);
  readonly formOpen = signal(false);

  readonly form = this.formBuilder.group({
    code: this.formBuilder.control('', [Validators.required]),
    discount: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    discountType: this.formBuilder.control<DiscountType>('percentage', [Validators.required]),
    startDate: this.formBuilder.control('', [Validators.required]),
    endDate: this.formBuilder.control('', [Validators.required]),
    isActive: this.formBuilder.control(true),
    usageLimit: this.formBuilder.control<number | null>(null),
    usageCount: this.formBuilder.control(0),
  });

  formatPrice(value: number): string {
    return this.currencyFormatter.format(value);
  }

  openCreateForm(): void {
    this.formError.set(null);
    this.resetForm();
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.formError.set(null);
  }

  resetForm(): void {
    this.editingCouponId.set(null);
    this.form.reset({
      code: '',
      discount: null,
      discountType: 'percentage',
      startDate: '',
      endDate: '',
      isActive: true,
      usageLimit: null,
      usageCount: 0,
    });
  }

  save(): void {
    this.formError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Revise os dados do cupom.');
      return;
    }

    const raw = this.form.getRawValue();
    const request: PromoCodeRequest = {
      ...raw,
      code: raw.code.toUpperCase(),
      discount: Number(raw.discount),
      usageLimit: raw.usageLimit === null ? null : Number(raw.usageLimit),
      usageCount: Number(raw.usageCount),
    };
    const editingId = this.editingCouponId();
    const action = editingId
      ? this.promoCodeService.update(editingId, request)
      : this.promoCodeService.create(request);

    this.saving.set(true);

    action.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: coupon => {
        const updated = editingId
          ? this.promoCodes.map(current => current.id === coupon.id ? coupon : current)
          : [coupon, ...this.promoCodes];
        this.promoCodesChange.emit(updated);
        this.resetForm();
        this.closeForm();
        this.notify.emit({ type: 'success', message: 'Cupom salvo com sucesso.' });
      },
      error: response => this.formError.set(response.error?.message ?? 'Nao foi possivel salvar o cupom.'),
    });
  }

  editCoupon(coupon: PromoCode): void {
    this.editingCouponId.set(coupon.id);
    this.formOpen.set(true);
    this.form.setValue({
      code: coupon.code,
      discount: coupon.discount,
      discountType: coupon.discountType,
      startDate: coupon.startDate,
      endDate: coupon.endDate,
      isActive: coupon.isActive,
      usageLimit: coupon.usageLimit ?? null,
      usageCount: coupon.usageCount,
    });
  }

  deleteCoupon(id: number): void {
    this.promoCodeService.delete(id).subscribe({
      next: () => {
        this.promoCodesChange.emit(this.promoCodes.filter(coupon => coupon.id !== id));
        this.notify.emit({ type: 'success', message: 'Cupom removido.' });
      },
      error: () => this.notify.emit({ type: 'error', message: 'Nao foi possivel remover o cupom.' }),
    });
  }
}
