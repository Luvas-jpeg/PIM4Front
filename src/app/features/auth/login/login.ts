import { apiErrorMessage } from '../../../core/http/api-error';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, switchMap, tap } from 'rxjs';
import { FieldError } from '../../../shared/validation/field-error';
import {
  digits,
  normalizePhone,
  personalValidators,
  emailValidator,
  requiredText,
  textLength,
} from '../../../shared/validation/profile.validators';
import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest, RegisterRequest } from '../../../core/models/auth.models';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, FieldError],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly sessionExpired = this.route.snapshot.queryParamMap.get('reason') === 'session-expired';
  readonly mode = signal<AuthMode>('login');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly loginForm = this.formBuilder.group({
    email: this.formBuilder.control('', [requiredText, emailValidator, textLength(1, 254)]),
    senha: this.formBuilder.control('', [Validators.required, Validators.maxLength(128)]),
  });

  readonly registerForm = this.formBuilder.group({
    nome: this.formBuilder.control('', personalValidators.nome),
    email: this.formBuilder.control('', personalValidators.email),
    senha: this.formBuilder.control('', [
      Validators.required,
      Validators.minLength(12),
      Validators.maxLength(128),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
    ]),
    cpf: this.formBuilder.control('', personalValidators.cpf),
    phone: this.formBuilder.control('', personalValidators.phone),
  });

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.error.set(null);
    this.success.set(null);
  }

  submitLogin(): void {
    if (this.loading()) return;
    this.error.set(null);
    this.success.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.error.set('Informe email e senha validos.');
      return;
    }

    this.loading.set(true);

    this.authService
      .login({
        ...this.loginForm.getRawValue(),
        email: this.loginForm.controls.email.value.trim().toLowerCase(),
      } as LoginRequest)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.navigateAfterAuth(),
        error: (response) => {
          this.error.set(
            response.status === 401
              ? 'E-mail ou senha inválidos. Confira os dados e tente novamente.'
              : apiErrorMessage(response, 'Não foi possível entrar.'),
          );
        },
      });
  }

  submitRegister(): void {
    if (this.loading()) return;
    this.error.set(null);
    this.success.set(null);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.error.set('Preencha os dados do cadastro corretamente.');
      return;
    }

    const raw = this.registerForm.getRawValue();
    const registerRequest: RegisterRequest = {
      ...raw,
      nome: raw.nome.trim(),
      email: raw.email.trim().toLowerCase(),
      cpf: digits(raw.cpf),
      phone: normalizePhone(raw.phone),
    };
    const loginRequest: LoginRequest = {
      email: registerRequest.email,
      senha: registerRequest.senha,
    };

    this.loading.set(true);

    let registered = false;
    this.authService
      .register(registerRequest)
      .pipe(
        tap(() => {
          registered = true;
        }),
        switchMap(() => this.authService.login(loginRequest)),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => {
          this.success.set('Conta criada com sucesso.');
          this.navigateAfterAuth();
        },
        error: (response) => {
          if (registered) {
            this.mode.set('login');
            this.loginForm.patchValue({ email: registerRequest.email, senha: '' });
            this.success.set('Conta criada. Entre com seu e-mail e senha para continuar.');
          }
          this.error.set(
            apiErrorMessage(
              response,
              registered
                ? 'Não foi possível entrar automaticamente.'
                : 'Não foi possível criar sua conta.',
            ),
          );
        },
      });
  }

  private navigateAfterAuth(): void {
    const requested = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
    const returnUrl =
      requested.startsWith('/') && !requested.startsWith('//') && !requested.startsWith('/login')
        ? requested
        : '/';

    void this.router.navigateByUrl(returnUrl);
  }
}
