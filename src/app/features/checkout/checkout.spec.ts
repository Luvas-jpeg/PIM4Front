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
import { CourseClass } from '../../core/models/course.models';
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

  const courseClass: CourseClass = {
    id: 7,
    courseId: 1,
    startDate: '2026-10-01T09:00:00',
    endDate: null,
    local: 'Sao Paulo',
    instructor: 'Instrutor Teste',
    capacity: 20,
    availableSeats: 19,
    status: 'scheduled',
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

  it('should not charge shipping', () => {
    cartService.add(product, 1);

    expect(component.shipping()).toBe(0);
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

  it('should submit course order and clear cart', () => {
    cartService.addCourse(
      { ...product, tipoProduto: 'course', nome: 'Curso teste' },
      courseClass,
      2,
    );
    orderServiceMock.create.mockReturnValue(of({
      message: 'Pedido criado com sucesso!',
      orderId: 10,
      total: 240,
    }));

    component.submit();

    const request = orderServiceMock.create.mock.calls[0][0] as CreateOrderRequest;
    expect(request.itens).toEqual([{
      produtoId: 1,
      turmaId: 7,
      quantidade: 2,
    }]);
    expect(request.paymentMethod).toBe('pix');
    expect(cartService.items()).toEqual([]);
  });

  it('should send the selected class when submitting a course order', () => {
    cartService.addCourse(
      { ...product, tipoProduto: 'course', id: 1, preco: 250 },
      courseClass,
      2,
    );
    orderServiceMock.create.mockReturnValue(of({
      message: 'Pedido criado com sucesso!',
      orderId: 11,
      total: 500,
    }));

    component.submit();

    const request = orderServiceMock.create.mock.calls[0][0] as CreateOrderRequest;
    expect(request.itens).toEqual([{
      produtoId: 1,
      turmaId: 7,
      quantidade: 2,
    }]);
  });

  it('should block a course order without a selected class', () => {
    cartService.add({ ...product, tipoProduto: 'course' }, 1);

    component.submit();

    expect(component.error()).toContain('Selecione uma turma');
    expect(orderServiceMock.create).not.toHaveBeenCalled();
  });

  it('should reject legacy equipment items in checkout', () => {
    cartService.add(product, 1);

    component.submit();

    expect(component.error()).toContain('somente cursos');
    expect(orderServiceMock.create).not.toHaveBeenCalled();
  });
});
