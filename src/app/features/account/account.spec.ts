import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Account } from './account';
import { AuthService } from '../../core/services/auth.service';

describe('Account', () => {
  let component: Account;
  let fixture: ComponentFixture<Account>;

  const user = {
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
  };

  const authServiceMock = {
    user: vi.fn(() => user),
    updateProfile: vi.fn(() => of(user)),
    logout: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Account],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Account);
    component = fixture.componentInstance;
    await fixture.whenStable();
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
});
