import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Account } from './account';
import { AuthService } from '../../core/services/auth.service';
import { EnrollmentService } from '../../core/services/enrollment.service';
import { OrderService } from '../../core/services/order.service';

describe('Account', () => {
  let component: Account;
  let fixture: ComponentFixture<Account>;

  const user = {
    id: 1,
    nome: 'Cliente Teste',
    email: 'cliente@email.com',
    cpf: '52998224725',
    phone: '11999999999',
    street: 'Rua A',
    number: '10',
    complement: '',
    neighborhood: 'Centro',
    city: 'Sao Paulo',
    state: 'SP',
    zipCode: '01001000',
    role: 'Cliente' as const,
  };

  const authServiceMock = {
    user: vi.fn(() => user),
    updateProfile: vi.fn(() => of(user)),
    logout: vi.fn(),
  };

  const enrollmentServiceMock = {
    getMine: vi.fn(() => of([])),
  };

  const orderServiceMock = {
    getMyOrders: vi.fn(() => of([])),
    cancel: vi.fn(() => of({})),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Account],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: EnrollmentService, useValue: enrollmentServiceMock },
        { provide: OrderService, useValue: orderServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Account);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => vi.clearAllMocks());

  it('blocks invalid address fields before updating the profile', () => {
    component.form.patchValue({ state: 'ZZ', zipCode: '123', phone: 'abcdefghij' });
    component.save();
    expect(authServiceMock.updateProfile).not.toHaveBeenCalled();
    expect(component.form.controls.state.hasError('state')).toBe(true);
    expect(component.form.controls.zipCode.hasError('zipCode')).toBe(true);
    expect(component.form.controls.phone.hasError('phone')).toBe(true);
  });

  it('normalizes formatted address and phone on save', () => {
    component.form.patchValue({ state: 'sp', zipCode: '01001-000', phone: '(11) 99999-9999' });
    component.save();
    expect(authServiceMock.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'SP',
        zipCode: '01001000',
        phone: '11999999999',
      }),
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fill form with current user', () => {
    expect(component.form.controls.email.value).toBe('cliente@email.com');
    expect(component.form.controls.zipCode.value).toBe('01001000');
  });

  it('should update profile', () => {
    component.save();

    expect(authServiceMock.updateProfile).toHaveBeenCalled();
  });
  it('shows a history loading failure separately from an empty history and allows retry', () => {
    orderServiceMock.getMyOrders.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    component.loadOrders();
    fixture.detectChanges();
    expect(component.loadingOrders()).toBe(false);
    expect(component.ordersError()).toContain('conexão');
    expect(component.error()).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Voce ainda nao possui pedidos.');
    component.loadOrders();
    fixture.detectChanges();
    expect(component.ordersError()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Voce ainda nao possui pedidos.');
  });

  it('preserves edited form values and releases the save button after a server failure', () => {
    authServiceMock.updateProfile.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    component.form.controls.nome.setValue('Nome editado');
    component.save();
    expect(component.form.controls.nome.value).toBe('Nome editado');
    expect(component.saving()).toBe(false);
    expect(component.success()).toBeNull();
    expect(component.error()).toContain('temporariamente indisponível');
  });
});
