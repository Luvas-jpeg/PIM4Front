import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Checkout } from './checkout';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { PromoCodeService } from '../../core/services/promo-code.service';
import { Product } from '../../core/models/product.models';
import { CreateOrderRequest } from '../../core/models/order.models';
import { AuthService } from '../../core/services/auth.service';

describe('Checkout', () => {
  let component: Checkout;
  let fixture: ComponentFixture<Checkout>;
  let cartService: CartService;

  const orderServiceMock = {
    create: vi.fn(),
  };

  const promoCodeServiceMock = {
    validate: vi.fn(),
  };

  const user = signal({
    id: 1,
    nome: 'Cliente Teste',
    email: 'cliente@email.com',
    cpf: '12345678901',
    phone: '11999999999',
    street: 'Rua A',
    number: '10',
    complement: '',
    neighborhood: 'Centro',
    city: 'Sao Paulo',
    state: 'SP',
    zipCode: '01001000',
    role: 'Cliente' as const,
  });

  const authServiceMock = {
    user,
    updateProfile: vi.fn(),
  };

  const product: Product = {
    id: 1,
    nome: 'Estetoscopio',
    preco: 120,
    tipoProduto: 'equipment',
    estoque: 5,
    description: 'Equipamento para atendimento clinico.',
    image: '',
    category: 'Diagnostico',
    date: '',
    location: '',
    instructor: '',
  };

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        provideRouter([]),
        { provide: OrderService, useValue: orderServiceMock },
        { provide: PromoCodeService, useValue: promoCodeServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    cartService = TestBed.inject(CartService);
    fixture = TestBed.createComponent(Checkout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate shipping for equipment orders', () => {
    cartService.add(product, 1);

    expect(component.shipping()).toBe(19.9);
  });

  it('should not charge shipping for course-only orders', () => {
    cartService.add({ ...product, tipoProduto: 'course' }, 1);

    expect(component.shipping()).toBe(0);
  });

  it('should apply percentage coupon', () => {
    cartService.add(product, 1);
    promoCodeServiceMock.validate.mockReturnValue(of({
      id: 1,
      code: 'MED10',
      discount: 10,
      discountType: 'percentage',
      startDate: '',
      endDate: '',
      isActive: true,
      usageCount: 0,
    }));

    component.form.controls.promoCode.setValue('med10');
    component.applyCoupon();

    expect(component.discount()).toBe(12);
  });

  it('should submit order and clear cart', () => {
    cartService.add(product, 2);
    orderServiceMock.create.mockReturnValue(of({
      message: 'Pedido criado com sucesso!',
      orderId: 10,
      total: 269.9,
    }));

    component.submit();

    const request = orderServiceMock.create.mock.calls[0][0] as CreateOrderRequest;
    expect(request.itens).toEqual([{ produtoId: 1, quantidade: 2 }]);
    expect(request.paymentMethod).toBe('pix');
    expect(cartService.items()).toEqual([]);
  });

  it('should ask for address when equipment order has no address', () => {
    user.set({
      ...user(),
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
    });
    cartService.add(product, 1);

    component.submit();

    expect(component.addressModalOpen()).toBe(true);
    expect(orderServiceMock.create).not.toHaveBeenCalled();
  });
});
