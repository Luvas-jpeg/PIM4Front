import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Login } from './login';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../core/models/auth.models';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let router: Router;

  const authResponse: AuthResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 86400,
    user: {
      id: 1,
      nome: 'Cliente Teste',
      email: 'cliente@email.com',
      cpf: '52998224725',
      phone: '11999999999',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
      role: 'Cliente',
    },
  };

  const authServiceMock = {
    login: vi.fn(),
    register: vi.fn(),
  };

  beforeEach(async () => {
    authServiceMock.login.mockReturnValue(of(authResponse));
    authServiceMock.register.mockReturnValue(
      of({
        message: 'Usuario cadastrado com sucesso!',
        userId: 1,
      }),
    );

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: vi.fn(() => '/checkout'),
              },
            },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should switch auth mode', () => {
    component.setMode('register');

    expect(component.mode()).toBe('register');
  });

  it('should show validation error when login form is invalid', () => {
    component.submitLogin();

    expect(authServiceMock.login).not.toHaveBeenCalled();
    expect(component.error()).toBe('Informe email e senha validos.');
  });

  it('should login and navigate to return url', () => {
    component.loginForm.setValue({
      email: 'cliente@email.com',
      senha: 'SenhaSegura123',
    });

    component.submitLogin();

    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'cliente@email.com',
      senha: 'SenhaSegura123',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/checkout');
  });

  it('blocks invalid CPF before sending registration and shows the field message', async () => {
    component.setMode('register');
    component.registerForm.setValue({
      nome: 'Cliente Teste',
      email: 'cliente@email.com',
      senha: 'SenhaSegura123',
      cpf: '11111111111',
      phone: '(11) 99999-9999',
    });
    component.submitRegister();
    fixture.detectChanges();
    expect(authServiceMock.register).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Informe um CPF válido');
  });

  it('normalizes formatted registration values without changing the password', () => {
    component.registerForm.setValue({
      nome: ' Cliente Teste ',
      email: ' CLIENTE@EMAIL.COM ',
      senha: 'SenhaSegura123 ',
      cpf: '529.982.247-25',
      phone: '+55 (11) 99999-9999',
    });
    component.submitRegister();
    expect(authServiceMock.register).toHaveBeenCalledWith({
      nome: 'Cliente Teste',
      email: 'cliente@email.com',
      senha: 'SenhaSegura123 ',
      cpf: '52998224725',
      phone: '11999999999',
    });
  });

  it('should register, login and navigate to return url', () => {
    component.registerForm.setValue({
      nome: 'Cliente Teste',
      email: 'cliente@email.com',
      senha: 'SenhaSegura123',
      cpf: '52998224725',
      phone: '11999999999',
    });

    component.submitRegister();

    expect(authServiceMock.register).toHaveBeenCalled();
    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'cliente@email.com',
      senha: 'SenhaSegura123',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/checkout');
  });
  it('shows an invalid-credentials message without confusing it with session expiry', () => {
    authServiceMock.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    component.loginForm.setValue({ email: 'cliente@email.com', senha: 'SenhaSegura123' });
    component.submitLogin();
    expect(component.error()).toContain('E-mail ou senha inválidos');
    expect(component.loading()).toBe(false);
  });

  it('keeps a successful registration visible when automatic login fails', () => {
    authServiceMock.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    component.registerForm.setValue({
      nome: 'Cliente Teste',
      email: 'cliente@email.com',
      senha: 'SenhaSegura123',
      cpf: '52998224725',
      phone: '11999999999',
    });
    component.submitRegister();
    expect(component.success()).toContain('Conta criada');
    expect(component.mode()).toBe('login');
    expect(component.error()).toContain('Aguarde');
    expect(component.loading()).toBe(false);
  });
});
