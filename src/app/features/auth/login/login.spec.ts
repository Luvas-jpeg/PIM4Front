import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
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
      cpf: '12345678901',
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
    authServiceMock.register.mockReturnValue(of({
      message: 'Usuario cadastrado com sucesso!',
      userId: 1,
    }));

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
      senha: '123456',
    });

    component.submitLogin();

    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'cliente@email.com',
      senha: '123456',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/checkout');
  });

  it('should register, login and navigate to return url', () => {
    component.registerForm.setValue({
      nome: 'Cliente Teste',
      email: 'cliente@email.com',
      senha: '123456',
      cpf: '12345678901',
      phone: '11999999999',
    });

    component.submitRegister();

    expect(authServiceMock.register).toHaveBeenCalled();
    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'cliente@email.com',
      senha: '123456',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/checkout');
  });
});
