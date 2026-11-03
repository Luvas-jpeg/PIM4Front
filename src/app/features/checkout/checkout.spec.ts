import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Checkout } from './checkout';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { PromoCodeService } from '../../core/services/promo-code.service';
import { Course } from '../../core/models/course.models';
import { CourseClass } from '../../core/models/course.models';
import { CreateOrderRequest } from '../../core/models/order.models';
import { AuthService } from '../../core/services/auth.service';

describe('Checkout', () => {
  let component: Checkout;
  let fixture: ComponentFixture<Checkout>;
  let cartService: CartService;
  let router: Router;

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

  const baseCourse: Course = {
    id: 1,
    nome: 'Estetoscopio',
    preco: 120,
    description: 'Equipamento para atendimento clinico.',
    image: '',
    category: 'Formacao',
    deliveryMode: 'ead',
    workloadHours: 10,
    isActive: true,
    classes: [],
    modules: [],
    assessments: [],
  };

  const courseClass: CourseClass = {
    id: 7,
    courseId: 1,
    startDate: '2026-10-01T09:00:00',
    endDate: null,
    local: 'Sao Paulo',
    instructor: 'Instrutor teste',
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

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
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
    cartService.add(baseCourse, 1);

    expect(component.shipping()).toBe(0);
  });

  it('should not charge shipping for course-only orders', () => {
    cartService.add({ ...baseCourse, deliveryMode: 'presencial' as const }, 1);

    expect(component.shipping()).toBe(0);
  });

  it('should apply percentage coupon', () => {
    cartService.add(baseCourse, 1);
    promoCodeServiceMock.validate.mockReturnValue(
      of({
        id: 1,
        code: 'MED10',
        discount: 10,
        discountType: 'percentage',
        startDate: '',
        endDate: '',
        isActive: true,
        usageCount: 0,
      }),
    );

    component.form.controls.promoCode.setValue('med10');
    component.applyCoupon();

    expect(component.discount()).toBe(12);
  });

  it('should submit course order and clear cart', () => {
    cartService.addCourse(
      { ...baseCourse, deliveryMode: 'presencial' as const, nome: 'Curso teste' },
      courseClass,
      1,
    );
    orderServiceMock.create.mockReturnValue(
      of({
        message: 'Pedido criado com sucesso!',
        orderId: 10,
        total: 120,
      }),
    );

    component.submit();

    const request = orderServiceMock.create.mock.calls[0][0] as CreateOrderRequest;
    expect(request.itens).toEqual([
      {
        courseId: 1,
        turmaId: 7,
        quantidade: 1,
      },
    ]);
    expect(request.paymentMethod).toBe('pix');
    expect(cartService.items()).toEqual([]);
    expect(router.navigate).toHaveBeenCalledWith(['/conta/pedido', 10]);
  });

  it('should send the selected class when submitting a course order', () => {
    cartService.addCourse(
      { ...baseCourse, deliveryMode: 'presencial' as const, id: 1, preco: 250 },
      courseClass,
      1,
    );
    orderServiceMock.create.mockReturnValue(
      of({
        message: 'Pedido criado com sucesso!',
        orderId: 11,
        total: 250,
      }),
    );

    component.submit();

    const request = orderServiceMock.create.mock.calls[0][0] as CreateOrderRequest;
    expect(request.itens).toEqual([
      {
        courseId: 1,
        turmaId: 7,
        quantidade: 1,
      },
    ]);
  });

  it('should block a course order without a selected class', () => {
    cartService.add({ ...baseCourse, deliveryMode: 'presencial' as const }, 1);

    component.submit();

    expect(component.error()).toContain('Selecione uma turma');
    expect(orderServiceMock.create).not.toHaveBeenCalled();
  });

  it('should submit EAD without a class using courseId', () => {
    cartService.add(baseCourse, 1);
    orderServiceMock.create.mockReturnValue(
      of({ message: 'Pedido criado', orderId: 12, total: 120 }),
    );
    component.submit();
    expect(orderServiceMock.create.mock.calls[0][0].itens).toEqual([
      { courseId: 1, turmaId: null, quantidade: 1 },
    ]);
  });
  it('keeps cart contents and reuses the request key after a lost response', () => {
    cartService.addCourse({ ...baseCourse, deliveryMode: 'presencial' }, courseClass);
    orderServiceMock.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    component.submit();
    expect(cartService.items()).toHaveLength(1);
    expect(component.submitting()).toBe(false);
    expect(component.error()).toContain('Meus pedidos');
    expect(router.navigate).not.toHaveBeenCalled();
    component.submit();
    expect(orderServiceMock.create.mock.calls[0][1]).toBe(orderServiceMock.create.mock.calls[1][1]);
  });

  it('uses a new key if the user changes the order after an error', () => {
    cartService.addCourse({ ...baseCourse, deliveryMode: 'presencial' }, courseClass);
    orderServiceMock.create.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    component.submit();
    component.form.controls.paymentMethod.setValue('credit_card');
    component.submit();
    expect(orderServiceMock.create.mock.calls[0][1]).not.toBe(
      orderServiceMock.create.mock.calls[1][1],
    );
  });

  it('ignores a second submit while the first order request is pending', () => {
    cartService.addCourse({ ...baseCourse, deliveryMode: 'presencial' }, courseClass);
    const pending = new Subject<never>();
    orderServiceMock.create.mockReturnValue(pending);
    component.submit();
    component.submit();
    expect(orderServiceMock.create).toHaveBeenCalledTimes(1);
    expect(component.submitting()).toBe(true);
    pending.error(new HttpErrorResponse({ status: 400, error: { message: 'Turma sem vagas.' } }));
    expect(component.error()).toBe('Turma sem vagas.');
    expect(component.submitting()).toBe(false);
    expect(cartService.items()).toHaveLength(1);
  });

  it('distinguishes a coupon connection failure from an invalid coupon', () => {
    promoCodeServiceMock.validate.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    component.form.controls.promoCode.setValue('MED10');
    component.applyCoupon();
    expect(component.promoMessage()).toContain('conexão');
    expect(component.validatingCoupon()).toBe(false);
  });

  it('does not create an order while the coupon is still being checked', () => {
    cartService.addCourse({ ...baseCourse, deliveryMode: 'presencial' }, courseClass);
    const pending = new Subject<never>();
    promoCodeServiceMock.validate.mockReturnValue(pending);
    component.form.controls.promoCode.setValue('MED10');
    component.applyCoupon();
    component.submit();
    expect(orderServiceMock.create).not.toHaveBeenCalled();
    expect(component.error()).toContain('Aguarde');
    pending.complete();
  });
});
